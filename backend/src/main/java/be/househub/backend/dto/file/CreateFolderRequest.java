package be.househub.backend.dto.file;

import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record CreateFolderRequest(
        @NotBlank String name,
        UUID parentFolderId
) {
}
