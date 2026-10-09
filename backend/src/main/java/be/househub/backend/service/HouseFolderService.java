package be.househub.backend.service;

import be.househub.backend.dto.file.CreateFolderRequest;
import be.househub.backend.dto.file.FolderContentsResponse;
import be.househub.backend.dto.file.HouseFileResponse;
import be.househub.backend.dto.file.HouseFolderResponse;
import be.househub.backend.entity.HouseFile;
import be.househub.backend.entity.HouseFolder;
import be.househub.backend.entity.Household;
import be.househub.backend.entity.User;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.HouseFileRepository;
import be.househub.backend.repository.HouseFolderRepository;
import be.househub.backend.service.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HouseFolderService {

    private final HouseFolderRepository houseFolderRepository;
    private final HouseFileRepository houseFileRepository;
    private final FileStorageService fileStorageService;
    private final HouseholdAccessService householdAccessService;

    public FolderContentsResponse getContents(Household household, UUID parentFolderId) {
        if (parentFolderId != null) {
            findOwned(household, parentFolderId);
        }

        List<HouseFolderResponse> folders = houseFolderRepository.findChildren(household.getId(), parentFolderId)
                .stream()
                .map(this::toResponse)
                .toList();

        List<HouseFileResponse> files = houseFileRepository.findChildren(household.getId(), parentFolderId)
                .stream()
                .map(this::toFileResponse)
                .toList();

        return new FolderContentsResponse(parentFolderId, folders, files);
    }

    @Transactional
    public HouseFolderResponse createFolder(Household household, User creator, CreateFolderRequest request) {
        HouseFolder parentFolder = null;
        if (request.parentFolderId() != null) {
            parentFolder = findOwned(household, request.parentFolderId());
        }

        HouseFolder folder = new HouseFolder();
        folder.setHousehold(household);
        folder.setParentFolder(parentFolder);
        folder.setName(request.name());
        folder.setCreatedBy(creator);

        return toResponse(houseFolderRepository.save(folder));
    }

    @Transactional
    public void deleteFolder(Household household, User currentUser, UUID folderId) {
        HouseFolder folder = findOwned(household, folderId);

        if (!householdAccessService.isOwner(currentUser, household.getId())
                && (folder.getCreatedBy() == null || !folder.getCreatedBy().getId().equals(currentUser.getId()))) {
            throw new AccessDeniedException("Only the household owner or the folder's creator can delete this folder");
        }

        List<UUID> subtreeFolderIds = collectSubtreeFolderIds(household.getId(), folderId);

        for (UUID id : subtreeFolderIds) {
            List<HouseFile> files = houseFileRepository.findChildren(household.getId(), id);
            for (HouseFile file : files) {
                fileStorageService.delete(file.getStorageKey());
            }
            houseFileRepository.deleteAll(files);
        }

        // delete children before parents
        for (int i = subtreeFolderIds.size() - 1; i >= 0; i--) {
            houseFolderRepository.findByIdAndHouseholdId(subtreeFolderIds.get(i), household.getId())
                    .ifPresent(houseFolderRepository::delete);
        }
    }

    private List<UUID> collectSubtreeFolderIds(UUID householdId, UUID rootFolderId) {
        List<UUID> result = new ArrayList<>();
        Deque<UUID> queue = new ArrayDeque<>();
        queue.add(rootFolderId);
        result.add(rootFolderId);

        while (!queue.isEmpty()) {
            UUID current = queue.poll();
            List<HouseFolder> children = houseFolderRepository.findChildren(householdId, current);
            for (HouseFolder child : children) {
                result.add(child.getId());
                queue.add(child.getId());
            }
        }

        return result;
    }

    private HouseFolder findOwned(Household household, UUID folderId) {
        return houseFolderRepository.findByIdAndHouseholdId(folderId, household.getId())
                .orElseThrow(() -> new ResourceNotFoundException("HouseFolder", folderId));
    }

    private HouseFolderResponse toResponse(HouseFolder folder) {
        return new HouseFolderResponse(
                folder.getId(),
                folder.getName(),
                folder.getParentFolder() != null ? folder.getParentFolder().getId() : null,
                folder.getCreatedBy() != null ? folder.getCreatedBy().getId() : null,
                folder.getCreatedBy() != null ? folder.getCreatedBy().getDisplayName() : null,
                folder.getCreatedAt()
        );
    }

    private HouseFileResponse toFileResponse(HouseFile file) {
        return new HouseFileResponse(
                file.getId(),
                file.getFilename(),
                file.getContentType(),
                file.getSizeBytes(),
                file.getUploadedBy() != null ? file.getUploadedBy().getId() : null,
                file.getUploadedBy() != null ? file.getUploadedBy().getDisplayName() : null,
                file.getUploadedAt(),
                file.getFolder() != null ? file.getFolder().getId() : null
        );
    }
}
