package be.househub.backend.dto.admin;

import java.time.LocalDate;
import java.util.UUID;

public record AdminTaskUpdateRequest(
        String title,
        Boolean done,
        LocalDate dueDate,
        UUID assignedToId
) {
}
