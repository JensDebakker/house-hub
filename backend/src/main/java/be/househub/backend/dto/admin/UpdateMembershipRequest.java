package be.househub.backend.dto.admin;

import be.househub.backend.entity.HouseholdRole;
import jakarta.validation.constraints.NotNull;

public record UpdateMembershipRequest(
        @NotNull HouseholdRole role
) {
}
