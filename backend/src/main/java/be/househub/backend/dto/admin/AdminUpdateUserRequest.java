package be.househub.backend.dto.admin;

import be.househub.backend.entity.Role;

public record AdminUpdateUserRequest(
        Role role
) {
}
