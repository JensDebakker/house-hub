package be.househub.backend.dto.admin;

import java.time.LocalDate;

public record AdminSupplyUpdateRequest(
        String name,
        Integer quantity,
        LocalDate expiryDate
) {
}
