package be.househub.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record RefreshRequest(

        @NotBlank String refreshToken
) {
}
