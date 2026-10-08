package be.househub.backend.dto.admin;

import be.househub.backend.entity.HouseholdRole;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AddMembershipRequest(
        @NotNull UUID userId,
        @NotNull HouseholdRole role
) {
}
