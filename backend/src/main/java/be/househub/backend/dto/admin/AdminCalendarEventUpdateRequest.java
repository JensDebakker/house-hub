package be.househub.backend.dto.admin;

import java.time.Instant;

public record AdminCalendarEventUpdateRequest(
        String title,
        Instant start,
        Instant end
) {
}
