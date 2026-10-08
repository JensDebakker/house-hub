package be.househub.backend.dto.household;

import be.househub.backend.entity.HouseholdRole;

import java.util.UUID;

public record HouseholdMembershipResponse(
        UUID householdId,
        String householdName,
        HouseholdRole role
) {
}
