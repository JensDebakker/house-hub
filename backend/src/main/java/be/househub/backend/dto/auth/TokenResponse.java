package be.househub.backend.dto.auth;

public record TokenResponse(
        String accessToken,
        String refreshToken
) {
}
