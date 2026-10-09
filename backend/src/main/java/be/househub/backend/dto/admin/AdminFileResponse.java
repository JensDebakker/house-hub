package be.househub.backend.dto.admin;

import java.time.Instant;
import java.util.UUID;

public record AdminFileResponse(
        UUID id,
        String filename,
        String contentType,
        long sizeBytes,
        UUID householdId,
        String householdName,
        UUID uploadedById,
        String uploadedByName,
        Instant uploadedAt
) {
}
