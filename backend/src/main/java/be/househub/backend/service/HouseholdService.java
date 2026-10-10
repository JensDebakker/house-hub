package be.househub.backend.service;

import be.househub.backend.dto.admin.HouseholdMemberResponse;
import be.househub.backend.dto.household.HouseholdMembershipResponse;
import be.househub.backend.dto.household.HouseholdResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.entity.HouseFile;
import be.househub.backend.entity.HouseFolder;
import be.househub.backend.entity.HouseholdMembership;
import be.househub.backend.entity.HouseholdRole;
import be.househub.backend.entity.User;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.CalendarEventRepository;
import be.househub.backend.repository.ChatMessageRepository;
import be.househub.backend.repository.HouseFileRepository;
import be.househub.backend.repository.HouseFolderRepository;
import be.househub.backend.repository.HouseholdMembershipRepository;
import be.househub.backend.repository.HouseholdRepository;
import be.househub.backend.repository.ShoppingListRepository;
import be.househub.backend.repository.SupplyRepository;
import be.househub.backend.repository.TaskRepository;
import be.househub.backend.repository.UserRepository;
import be.househub.backend.service.storage.FileStorageService;
import be.househub.backend.websocket.SessionRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HouseholdService {

    private static final String INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int INVITE_CODE_LENGTH = 8;

    private final HouseholdRepository householdRepository;
    private final HouseholdMembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final SupplyRepository supplyRepository;
    private final ShoppingListRepository shoppingListRepository;
    private final CalendarEventRepository calendarEventRepository;
    private final HouseFileRepository houseFileRepository;
    private final HouseFolderRepository houseFolderRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final FileStorageService fileStorageService;
    private final SessionRegistry sessionRegistry;

    public List<HouseholdMembershipResponse> findMemberships(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        UUID defaultHouseholdId = user.getDefaultHousehold() != null ? user.getDefaultHousehold().getId() : null;

        return membershipRepository.findByUserId(userId).stream()
                .map(m -> toMembershipResponse(m, defaultHouseholdId))
                .toList();
    }

    /**
     * For callers (e.g. admin endpoints) that already have the owning {@link User}
     * loaded (e.g. right after creating/updating their membership), so they can skip
     * a redundant lookup.
     */
    public HouseholdMembershipResponse toMembershipResponse(HouseholdMembership membership, User user) {
        UUID defaultHouseholdId = user.getDefaultHousehold() != null ? user.getDefaultHousehold().getId() : null;
        return toMembershipResponse(membership, defaultHouseholdId);
    }

    private HouseholdMembershipResponse toMembershipResponse(HouseholdMembership m, UUID defaultHouseholdId) {
        UUID householdId = m.getHousehold().getId();
        return new HouseholdMembershipResponse(
                householdId,
                m.getHousehold().getName(),
                m.getRole(),
                membershipRepository.countByHouseholdId(householdId),
                sessionRegistry.distinctUserCount(householdId),
                householdId.equals(defaultHouseholdId)
        );
    }

    public HouseholdResponse toResponse(Household household) {
        UUID id = household.getId();
        return new HouseholdResponse(
                id,
                household.getName(),
                household.getInviteCode(),
                membershipRepository.countByHouseholdId(id),
                taskRepository.countByHouseholdId(id),
                supplyRepository.countByHouseholdId(id),
                shoppingListRepository.countByHouseholdId(id),
                calendarEventRepository.countByHouseholdId(id),
                houseFileRepository.countByHouseholdId(id),
                houseFileRepository.sumSizeBytesByHouseholdId(id),
                household.getStorageLimitBytes(),
                household.getCreatedAt()
        );
    }

    /**
     * Generates an invite code unique across all households.
     */
    public String generateInviteCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder(INVITE_CODE_LENGTH);
            for (int i = 0; i < INVITE_CODE_LENGTH; i++) {
                sb.append(INVITE_CODE_ALPHABET.charAt(
                        ThreadLocalRandom.current().nextInt(INVITE_CODE_ALPHABET.length())));
            }
            code = sb.toString();
        } while (householdRepository.existsByInviteCode(code));
        return code;
    }

    @Transactional
    public HouseholdResponse createHousehold(User owner, String name) {
        Household household = new Household();
        household.setName(name);
        household.setInviteCode(generateInviteCode());
        household = householdRepository.save(household);

        HouseholdMembership membership = new HouseholdMembership();
        membership.setUser(owner);
        membership.setHousehold(household);
        membership.setRole(HouseholdRole.OWNER);
        membershipRepository.save(membership);

        if (owner.getDefaultHousehold() == null) {
            owner.setDefaultHousehold(household);
            userRepository.save(owner);
        }

        return toResponse(household);
    }

    @Transactional
    public HouseholdResponse joinHousehold(User user, String inviteCode) {
        String normalized = inviteCode.trim().toUpperCase(Locale.ROOT);
        Household household = householdRepository.findByInviteCode(normalized)
                .orElseThrow(() -> new ResourceNotFoundException("Household", normalized));

        if (membershipRepository.existsByUserIdAndHouseholdId(user.getId(), household.getId())) {
            throw new IllegalStateException("You are already a member of this household");
        }

        HouseholdMembership membership = new HouseholdMembership();
        membership.setUser(user);
        membership.setHousehold(household);
        membership.setRole(HouseholdRole.MEMBER);
        membershipRepository.save(membership);

        if (user.getDefaultHousehold() == null) {
            user.setDefaultHousehold(household);
            userRepository.save(user);
        }

        return toResponse(household);
    }

    @Transactional
    public void leaveHousehold(User user, UUID householdId) {
        HouseholdMembership membership = membershipRepository.findByUserIdAndHouseholdId(user.getId(), householdId)
                .orElseThrow(() -> new ResourceNotFoundException("HouseholdMembership", user.getId()));

        long total = membershipRepository.countByHouseholdId(householdId);
        if (total > 1 && membership.getRole() == HouseholdRole.OWNER) {
            boolean anotherOwnerExists = membershipRepository.findByHouseholdId(householdId).stream()
                    .anyMatch(m -> !m.getUser().getId().equals(user.getId()) && m.getRole() == HouseholdRole.OWNER);
            if (!anotherOwnerExists) {
                throw new IllegalStateException(
                        "Cannot leave — you are the last owner; promote another member first");
            }
        }

        membershipRepository.deleteByUserIdAndHouseholdId(user.getId(), householdId);
        clearDefaultIfLeavingHousehold(user.getId(), householdId);
    }

    /**
     * Shared by every path that removes a user's membership in a household
     * ({@link #leaveHousehold}, {@link #removeMember}, and {@code AdminService}'s
     * removal path via {@link #removeMember}): if the household the user just lost
     * membership in was their default, clears it and auto-promotes one of their
     * remaining memberships (if any) to be the new default — never leaves a user's
     * {@code defaultHousehold} pointing at a household they're no longer a member of.
     * Picks the same "natural default" the backfill migration uses for the same
     * situation: a membership they OWN, tiebroken by earliest {@code joinedAt}.
     */
    private void clearDefaultIfLeavingHousehold(UUID userId, UUID householdId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        boolean wasDefault = user.getDefaultHousehold() != null
                && user.getDefaultHousehold().getId().equals(householdId);
        if (!wasDefault) {
            return;
        }

        List<HouseholdMembership> remaining = membershipRepository.findByUserId(userId);
        Household newDefault = remaining.stream()
                .min(Comparator
                        .comparing((HouseholdMembership m) -> m.getRole() == HouseholdRole.OWNER ? 0 : 1)
                        .thenComparing(HouseholdMembership::getJoinedAt))
                .map(HouseholdMembership::getHousehold)
                .orElse(null);
        user.setDefaultHousehold(newDefault);
        userRepository.save(user);
    }

    /**
     * Sets {@code householdId} as the user's default household — the one that opens
     * automatically on login. The user must already be a member of it.
     */
    @Transactional
    public void setDefaultHousehold(User user, UUID householdId) {
        HouseholdMembership membership = membershipRepository.findByUserIdAndHouseholdId(user.getId(), householdId)
                .orElseThrow(() -> new ResourceNotFoundException("HouseholdMembership", user.getId()));

        user.setDefaultHousehold(membership.getHousehold());
        userRepository.save(user);
    }

    @Transactional
    public void removeMember(UUID householdId, UUID userId) {
        if (!membershipRepository.existsByUserIdAndHouseholdId(userId, householdId)) {
            throw new ResourceNotFoundException("HouseholdMembership", userId);
        }
        membershipRepository.deleteByUserIdAndHouseholdId(userId, householdId);
        clearDefaultIfLeavingHousehold(userId, householdId);
    }

    public List<HouseholdMemberResponse> findMembers(UUID householdId) {
        return membershipRepository.findByHouseholdId(householdId).stream()
                .map(m -> new HouseholdMemberResponse(
                        m.getUser().getId(), m.getUser().getDisplayName(), m.getUser().getEmail(), m.getRole()))
                .toList();
    }

    /**
     * Permanently deletes a household and everything in it (admin-only - there's no
     * self-service equivalent). None of the household_id foreign keys below cascade at
     * the DB level (only users.default_household_id does, via ON DELETE SET NULL), so
     * each dependent table is emptied explicitly, files/folders first since those two
     * reference each other and nothing else does.
     */
    @Transactional
    public void deleteHousehold(UUID householdId) {
        Household household = householdRepository.findById(householdId)
                .orElseThrow(() -> new ResourceNotFoundException("Household", householdId));

        List<HouseFile> files = houseFileRepository.findByHouseholdId(householdId);
        files.forEach(file -> fileStorageService.delete(file.getStorageKey()));
        houseFileRepository.deleteAll(files);

        deleteFoldersDeepestFirst(householdId);

        shoppingListRepository.deleteAll(shoppingListRepository.findByHouseholdId(householdId));
        taskRepository.deleteByHouseholdId(householdId);
        supplyRepository.deleteByHouseholdId(householdId);
        calendarEventRepository.deleteByHouseholdId(householdId);
        chatMessageRepository.deleteByHouseholdId(householdId);
        membershipRepository.deleteByHouseholdId(householdId);

        householdRepository.delete(household);
    }

    /**
     * house_folders is self-referential (parent_folder_id -> house_folders.id) with no
     * cascade, so children must go before their parents. Repeatedly deletes whichever
     * remaining folders aren't currently any other remaining folder's parent, i.e. the
     * current leaves of what's left of the tree.
     */
    private void deleteFoldersDeepestFirst(UUID householdId) {
        List<HouseFolder> remaining = new ArrayList<>(houseFolderRepository.findByHouseholdId(householdId));
        while (!remaining.isEmpty()) {
            Set<UUID> parentIds = new HashSet<>();
            for (HouseFolder folder : remaining) {
                if (folder.getParentFolder() != null) {
                    parentIds.add(folder.getParentFolder().getId());
                }
            }

            List<HouseFolder> leaves = remaining.stream()
                    .filter(folder -> !parentIds.contains(folder.getId()))
                    .toList();
            houseFolderRepository.deleteAll(leaves);
            remaining.removeAll(leaves);
        }
    }
}
