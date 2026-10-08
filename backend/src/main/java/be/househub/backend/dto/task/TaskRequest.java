package be.househub.backend.dto.task;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record TaskRequest(

        @NotBlank @Size(max = 200) String title,

        boolean done,

        UUID assignedTo,

        LocalDate dueDate
) {
}
