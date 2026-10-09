package be.househub.backend.dto.admin;

import java.time.LocalDate;
import java.util.UUID;

public record AdminSupplyResponse(
        UUID id,
        String name,
        int quantity,
        LocalDate expiryDate,
        UUID householdId,
        String householdName
) {
}
