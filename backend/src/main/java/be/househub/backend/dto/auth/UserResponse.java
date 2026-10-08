package be.househub.backend.dto.auth;

import be.househub.backend.dto.household.HouseholdMembershipResponse;
import be.househub.backend.entity.Role;

import java.util.List;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String displayName,
        Role role,
        List<HouseholdMembershipResponse> households,
        boolean emailVerified
) {
}
