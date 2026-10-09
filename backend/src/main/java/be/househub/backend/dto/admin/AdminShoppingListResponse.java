package be.househub.backend.dto.admin;

import be.househub.backend.dto.shopping.ShoppingListItemResponse;

import java.util.List;
import java.util.UUID;

public record AdminShoppingListResponse(
        UUID id,
        String name,
        UUID householdId,
        String householdName,
        List<ShoppingListItemResponse> items
) {
}
