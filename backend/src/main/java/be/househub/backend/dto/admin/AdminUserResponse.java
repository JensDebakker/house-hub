package be.househub.backend.dto.admin;

import be.househub.backend.entity.HouseholdRole;
import be.househub.backend.entity.Role;

import java.time.Instant;
import java.util.UUID;

public record AdminUserResponse(
        UUID id,
        String email,
        String displayName,
        Role role,
        UUID householdId,
        String householdName,
        HouseholdRole householdRole,
        boolean emailVerified,
        Instant createdAt
) {
}
