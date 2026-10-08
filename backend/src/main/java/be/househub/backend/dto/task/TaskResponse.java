package be.househub.backend.dto.task;

import java.time.LocalDate;
import java.util.UUID;

public record TaskResponse(
        UUID id,
        String title,
        boolean done,
        UUID assignedTo,
        LocalDate dueDate
) {
}
