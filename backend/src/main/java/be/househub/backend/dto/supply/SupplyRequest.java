package be.househub.backend.dto.supply;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record SupplyRequest(

        @NotBlank @Size(max = 200) String name,

        @Min(0) int quantity,

        @NotNull LocalDate expiryDate
) {
}
