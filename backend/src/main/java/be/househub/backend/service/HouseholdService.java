package be.househub.backend.service;

import be.househub.backend.dto.admin.HouseholdMemberResponse;
import be.househub.backend.dto.household.HouseholdMembershipResponse;
import be.househub.backend.dto.household.HouseholdResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.entity.HouseholdMembership;
import be.househub.backend.entity.HouseholdRole;
import be.househub.backend.entity.User;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.CalendarEventRepository;
import be.househub.backend.repository.HouseFileRepository;
import be.househub.backend.repository.HouseholdMembershipRepository;
import be.househub.backend.repository.HouseholdRepository;
import be.househub.backend.repository.ShoppingListRepository;
import be.househub.backend.repository.SupplyRepository;
import be.househub.backend.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
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
    private final TaskRepository taskRepository;
    private final SupplyRepository supplyRepository;
    private final ShoppingListRepository shoppingListRepository;
    private final CalendarEventRepository calendarEventRepository;
    private final HouseFileRepository houseFileRepository;

    public List<HouseholdMembershipResponse> findMemberships(UUID userId) {
        return membershipRepository.findByUserId(userId).stream()
                .map(m -> new HouseholdMembershipResponse(m.getHousehold().getId(), m.getHousehold().getName(), m.getRole()))
                .toList();
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
     * Generates an invite code unique across all households. Shared by self-service
     * household creation and the auto-created household on registration.
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
    }

    @Transactional
    public void removeMember(UUID householdId, UUID userId) {
        if (!membershipRepository.existsByUserIdAndHouseholdId(userId, householdId)) {
            throw new ResourceNotFoundException("HouseholdMembership", userId);
        }
        membershipRepository.deleteByUserIdAndHouseholdId(userId, householdId);
    }

    public List<HouseholdMemberResponse> findMembers(UUID householdId) {
        return membershipRepository.findByHouseholdId(householdId).stream()
                .map(m -> new HouseholdMemberResponse(
                        m.getUser().getId(), m.getUser().getDisplayName(), m.getUser().getEmail(), m.getRole()))
                .toList();
    }
}
