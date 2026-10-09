package be.househub.backend.dto.admin;

import java.time.Instant;
import java.util.UUID;

public record AdminCalendarEventResponse(
        UUID id,
        String title,
        Instant start,
        Instant end,
        UUID householdId,
        String householdName
) {
}
