package be.househub.backend.dto.file;

import java.time.Instant;
import java.util.UUID;

public record HouseFileResponse(
        UUID id,
        String filename,
        String contentType,
        long sizeBytes,
        UUID uploadedById,
        String uploadedByName,
        Instant uploadedAt,
        UUID folderId
) {
}
