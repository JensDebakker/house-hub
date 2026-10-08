package be.househub.backend.dto.household;

import java.time.Instant;
import java.util.UUID;

public record HouseholdResponse(
        UUID id,
        String name,
        String inviteCode,
        long memberCount,
        long taskCount,
        long supplyCount,
        long shoppingListCount,
        long calendarEventCount,
        long fileCount,
        long storageUsedBytes,
        long storageLimitBytes,
        Instant createdAt
) {
}
