package be.househub.backend.dto.admin;

import be.househub.backend.entity.HouseholdRole;

import java.util.UUID;

public record HouseholdMemberResponse(
        UUID userId,
        String displayName,
        String email,
        HouseholdRole role
) {
}
