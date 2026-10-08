package be.househub.backend.dto.shopping;

import java.util.UUID;

public record ShoppingListItemResponse(
        UUID id,
        String label,
        boolean checked
) {
}
