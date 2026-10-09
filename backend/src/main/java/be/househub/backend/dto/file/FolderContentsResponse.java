package be.househub.backend.dto.file;

import java.util.List;
import java.util.UUID;

public record FolderContentsResponse(
        UUID folderId,
        List<HouseFolderResponse> folders,
        List<HouseFileResponse> files
) {
}
