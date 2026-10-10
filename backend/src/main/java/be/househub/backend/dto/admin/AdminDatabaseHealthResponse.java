package be.househub.backend.dto.admin;

public record AdminDatabaseHealthResponse(
        String status,
        long responseTimeMs,
        String error
) {
}
