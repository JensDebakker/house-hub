package be.househub.backend.dto.shopping;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ShoppingListItemRequest(

        @NotBlank @Size(max = 200) String label,

        boolean checked
) {
}
