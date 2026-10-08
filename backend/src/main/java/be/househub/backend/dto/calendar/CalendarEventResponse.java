package be.househub.backend.dto.calendar;

import java.time.Instant;
import java.util.UUID;

public record CalendarEventResponse(
        UUID id,
        String title,
        Instant start,
        Instant end
) {
}
