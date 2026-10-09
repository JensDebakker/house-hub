package be.househub.backend.dto.file;

import java.time.Instant;
import java.util.UUID;

public record HouseFolderResponse(
        UUID id,
        String name,
        UUID parentFolderId,
        UUID createdById,
        String createdByName,
        Instant createdAt
) {
}
