package be.househub.backend.dto.shopping;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ShoppingListRequest(

        @NotBlank @Size(max = 100) String name
) {
}
