package be.househub.backend.dto.admin;

import java.time.LocalDate;
import java.util.UUID;

public record AdminTaskResponse(
        UUID id,
        String title,
        boolean done,
        LocalDate dueDate,
        UUID assignedToId,
        String assignedToName,
        UUID householdId,
        String householdName
) {
}
