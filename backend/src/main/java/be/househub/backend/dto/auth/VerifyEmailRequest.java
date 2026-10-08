package be.househub.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record VerifyEmailRequest(

        @NotBlank String token
) {
}
