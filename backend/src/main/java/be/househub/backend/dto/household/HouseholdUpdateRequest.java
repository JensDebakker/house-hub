package be.househub.backend.dto.household;

public record HouseholdUpdateRequest(
        String name,
        Long storageLimitBytes
) {
}
