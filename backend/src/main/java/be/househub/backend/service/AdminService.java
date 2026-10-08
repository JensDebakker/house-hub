package be.househub.backend.service;

import be.househub.backend.dto.admin.AdminUpdateUserRequest;
import be.househub.backend.dto.admin.AdminUserResponse;
import be.househub.backend.dto.household.HouseholdResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.entity.User;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.HouseholdRepository;
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

    public List<AdminUserResponse> listUsers() {
        return userRepository.findAll().stream()
                .map(this::toAdminUserResponse)
                .toList();
    }

    public List<HouseholdResponse> listHouseholds() {
        return householdRepository.findAll().stream()
                .map(household -> new HouseholdResponse(
                        household.getId(),
                        household.getName(),
                        userRepository.countByHouseholdId(household.getId())))
                .toList();
    }

    @Transactional
    public AdminUserResponse updateUser(UUID userId, AdminUpdateUserRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (request.role() != null) {
            user.setRole(request.role());
        }
        if (request.householdId() != null) {
            Household household = householdRepository.findById(request.householdId())
                    .orElseThrow(() -> new ResourceNotFoundException("Household", request.householdId()));
            user.setHousehold(household);
        }
        if (request.householdRole() != null) {
            user.setHouseholdRole(request.householdRole());
        }

        return toAdminUserResponse(userRepository.save(user));
    }

    private AdminUserResponse toAdminUserResponse(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole(),
                user.getHousehold().getId(),
                user.getHousehold().getName(),
                user.getHouseholdRole(),
                user.isEmailVerified(),
                user.getCreatedAt()
        );
    }
}
