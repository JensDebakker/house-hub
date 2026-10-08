package be.househub.backend.dto.shopping;

import java.util.List;
import java.util.UUID;

public record ShoppingListResponse(
        UUID id,
        String name,
        List<ShoppingListItemResponse> items
) {
}
