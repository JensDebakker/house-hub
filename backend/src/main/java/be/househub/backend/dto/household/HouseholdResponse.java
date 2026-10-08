package be.househub.backend.dto.household;

import java.util.UUID;

public record HouseholdResponse(
        UUID id,
        String name,
        long memberCount
) {
}
