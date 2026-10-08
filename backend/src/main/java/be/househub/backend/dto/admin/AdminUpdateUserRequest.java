package be.househub.backend.dto.admin;

import be.househub.backend.entity.HouseholdRole;
import be.househub.backend.entity.Role;

import java.util.UUID;

public record AdminUpdateUserRequest(
        Role role,
        UUID householdId,
        HouseholdRole householdRole
) {
}
