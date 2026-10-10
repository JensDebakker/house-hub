package be.househub.backend.service;

import be.househub.backend.dto.file.HouseFileResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.entity.HouseFile;
import be.househub.backend.entity.HouseFolder;
import be.househub.backend.entity.User;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.exception.StorageLimitExceededException;
import be.househub.backend.repository.HouseFileRepository;
import be.househub.backend.repository.HouseFolderRepository;
import be.househub.backend.service.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HouseFileService {

    private final HouseFileRepository houseFileRepository;
    private final HouseFolderRepository houseFolderRepository;
    private final FileStorageService fileStorageService;
    private final HouseholdAccessService householdAccessService;

    @Value("${app.files.max-file-size-bytes:536870912}")
    private long maxFileSizeBytes;

    public List<HouseFileResponse> findAll(Household household) {
        return houseFileRepository.findByHouseholdId(household.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public HouseFileResponse upload(Household household, User uploader, MultipartFile file, UUID folderId) {
        if (file.getSize() > maxFileSizeBytes) {
            throw new StorageLimitExceededException(
                    "File exceeds the maximum allowed size of " + maxFileSizeBytes + " bytes");
        }

        long usedBytes = houseFileRepository.sumSizeBytesByHouseholdId(household.getId());
        if (usedBytes + file.getSize() > household.getStorageLimitBytes()) {
            throw new StorageLimitExceededException(
                    "This household has reached its storage limit of " + household.getStorageLimitBytes() + " bytes");
        }

        HouseFolder folder = null;
        if (folderId != null) {
            folder = houseFolderRepository.findByIdAndHouseholdId(folderId, household.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("HouseFolder", folderId));
        }

        String safeFilename = sanitizeFilename(file.getOriginalFilename());
        String storageKey = household.getId() + "/" + UUID.randomUUID() + "-" + safeFilename;
        try {
            fileStorageService.store(storageKey, file.getInputStream(), file.getSize(), file.getContentType());
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }

        HouseFile houseFile = new HouseFile();
        houseFile.setHousehold(household);
        houseFile.setUploadedBy(uploader);
        houseFile.setFolder(folder);
        houseFile.setFilename(safeFilename);
        houseFile.setContentType(file.getContentType());
        houseFile.setSizeBytes(file.getSize());
        houseFile.setStorageKey(storageKey);

        return toResponse(houseFileRepository.save(houseFile));
    }

    public FileStorageService.StoredFile download(Household household, UUID fileId) {
        HouseFile houseFile = findOwned(household, fileId);
        return fileStorageService.load(houseFile.getStorageKey());
    }

    public HouseFileResponse getMetadata(Household household, UUID fileId) {
        return toResponse(findOwned(household, fileId));
    }

    @Transactional
    public void delete(Household household, User currentUser, UUID fileId) {
        HouseFile houseFile = findOwned(household, fileId);

        UUID uploaderId = houseFile.getUploadedBy() != null ? houseFile.getUploadedBy().getId() : null;
        householdAccessService.requireOwnerOrCreator(currentUser, household, uploaderId,
                "Only the household owner or the original uploader can delete this file");

        fileStorageService.delete(houseFile.getStorageKey());
        houseFileRepository.delete(houseFile);
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "file";
        }
        String baseName = filename.replace('\\', '/');
        baseName = baseName.substring(baseName.lastIndexOf('/') + 1);
        baseName = baseName.replaceAll("[^A-Za-z0-9._-]", "_");
        return baseName.isBlank() ? "file" : baseName;
    }

    private HouseFile findOwned(Household household, UUID fileId) {
        return houseFileRepository.findByIdAndHouseholdId(fileId, household.getId())
                .orElseThrow(() -> new ResourceNotFoundException("HouseFile", fileId));
    }

    private HouseFileResponse toResponse(HouseFile file) {
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
