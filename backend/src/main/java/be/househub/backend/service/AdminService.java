package be.househub.backend.service;

import be.househub.backend.dto.admin.AddMembershipRequest;
import be.househub.backend.dto.admin.AdminUpdateUserRequest;
import be.househub.backend.dto.admin.AdminUserResponse;
import be.househub.backend.dto.admin.HouseholdDetailResponse;
import be.househub.backend.dto.admin.HouseholdMemberResponse;
import be.househub.backend.dto.admin.UpdateMembershipRequest;
import be.househub.backend.dto.admin.UserDetailResponse;
import be.househub.backend.dto.household.HouseholdMembershipResponse;
import be.househub.backend.dto.household.HouseholdResponse;
import be.househub.backend.dto.household.HouseholdUpdateRequest;
import be.househub.backend.dto.task.TaskResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.entity.HouseholdMembership;
import be.househub.backend.entity.User;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.HouseholdMembershipRepository;
import be.househub.backend.repository.HouseholdRepository;
import be.househub.backend.repository.TaskRepository;
import be.househub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminService {

    private final UserRepository userRepository;
    private final HouseholdRepository householdRepository;
    private final HouseholdMembershipRepository membershipRepository;
    private final TaskRepository taskRepository;
    private final HouseholdService householdService;
    private final TaskService taskService;
    private final SupplyService supplyService;
    private final ShoppingListService shoppingListService;
    private final CalendarEventService calendarEventService;
    private final HouseFileService houseFileService;

    public List<AdminUserResponse> listUsers() {
        return userRepository.findAll().stream()
                .map(this::toAdminUserResponse)
                .toList();
    }

    public UserDetailResponse getUser(UUID userId) {
        User user = findUser(userId);
        return new UserDetailResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole(),
                user.isEmailVerified(),
                user.getCreatedAt(),
                householdService.findMemberships(userId),
                taskRepository.findByAssignedToId(userId).stream()
                        .map(t -> new TaskResponse(
                                t.getId(), t.getTitle(), t.isDone(),
                                t.getAssignedTo() != null ? t.getAssignedTo().getId() : null, t.getDueDate()))
                        .toList()
        );
    }

    @Transactional
    public AdminUserResponse updateUser(UUID userId, AdminUpdateUserRequest request) {
        User user = findUser(userId);
        if (request.role() != null) {
            user.setRole(request.role());
        }
        return toAdminUserResponse(userRepository.save(user));
    }

    public List<HouseholdResponse> listHouseholds() {
        return householdRepository.findAll().stream()
                .map(householdService::toResponse)
                .toList();
    }

    public HouseholdDetailResponse getHousehold(UUID householdId) {
        Household household = findHousehold(householdId);
        List<HouseholdMemberResponse> members = membershipRepository.findByHouseholdId(householdId).stream()
                .map(m -> new HouseholdMemberResponse(
                        m.getUser().getId(), m.getUser().getDisplayName(), m.getUser().getEmail(), m.getRole()))
                .toList();

        return new HouseholdDetailResponse(
                householdService.toResponse(household),
                members,
                taskService.findAll(household),
                supplyService.findAll(household),
                shoppingListService.findAll(household),
                calendarEventService.findAll(household),
                houseFileService.findAll(household)
        );
    }

    @Transactional
    public HouseholdResponse updateHousehold(UUID householdId, HouseholdUpdateRequest request) {
        Household household = findHousehold(householdId);
        if (request.name() != null) {
            household.setName(request.name());
        }
        if (request.storageLimitBytes() != null) {
            household.setStorageLimitBytes(request.storageLimitBytes());
        }
        return householdService.toResponse(householdRepository.save(household));
    }

    @Transactional
    public HouseholdMembershipResponse addMembership(UUID householdId, AddMembershipRequest request) {
        Household household = findHousehold(householdId);
        User user = findUser(request.userId());

        if (membershipRepository.existsByUserIdAndHouseholdId(user.getId(), householdId)) {
            throw new IllegalStateException("User is already a member of this household");
        }

        HouseholdMembership membership = new HouseholdMembership();
        membership.setUser(user);
        membership.setHousehold(household);
        membership.setRole(request.role());
        membershipRepository.save(membership);

        return new HouseholdMembershipResponse(household.getId(), household.getName(), membership.getRole());
    }

    @Transactional
    public HouseholdMembershipResponse updateMembership(UUID householdId, UUID userId, UpdateMembershipRequest request) {
        HouseholdMembership membership = membershipRepository.findByUserIdAndHouseholdId(userId, householdId)
                .orElseThrow(() -> new ResourceNotFoundException("HouseholdMembership", userId));
        membership.setRole(request.role());
        membershipRepository.save(membership);
        return new HouseholdMembershipResponse(householdId, membership.getHousehold().getName(), membership.getRole());
    }

    @Transactional
    public void removeMembership(UUID householdId, UUID userId) {
        membershipRepository.deleteByUserIdAndHouseholdId(userId, householdId);
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
    }

    private Household findHousehold(UUID householdId) {
        return householdRepository.findById(householdId)
                .orElseThrow(() -> new ResourceNotFoundException("Household", householdId));
    }

    private AdminUserResponse toAdminUserResponse(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole(),
                householdService.findMemberships(user.getId()),
                user.isEmailVerified(),
                user.getCreatedAt()
        );
    }
}
