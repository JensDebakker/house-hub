package be.househub.backend.dto.calendar;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record CalendarEventRequest(

        @NotBlank @Size(max = 200) String title,

        @NotNull Instant start,

        Instant end
) {
}
