package be.househub.backend.dto.supply;

import java.time.LocalDate;
import java.util.UUID;

public record SupplyResponse(
        UUID id,
        String name,
        int quantity,
        LocalDate expiryDate
) {
}
