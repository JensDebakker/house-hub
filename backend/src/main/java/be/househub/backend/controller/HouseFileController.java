package be.househub.backend.controller;

import be.househub.backend.dto.file.HouseFileResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.security.SecurityUtils;
import be.househub.backend.service.HouseFileService;
import be.househub.backend.service.HouseholdAccessService;
import be.househub.backend.service.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/households/{householdId}/files")
@RequiredArgsConstructor
public class HouseFileController {

    private final HouseFileService houseFileService;
    private final HouseholdAccessService householdAccessService;

    @GetMapping
    public List<HouseFileResponse> findAll(@PathVariable UUID householdId) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        return houseFileService.findAll(household);
    }

    @PostMapping
    public ResponseEntity<HouseFileResponse> upload(@PathVariable UUID householdId, @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) UUID folderId) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        HouseFileResponse created = houseFileService.upload(household, SecurityUtils.getCurrentUser(), file, folderId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{fileId}")
    public ResponseEntity<InputStreamResource> download(@PathVariable UUID householdId, @PathVariable UUID fileId) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        HouseFileResponse metadata = houseFileService.getMetadata(household, fileId);
        FileStorageService.StoredFile stored = houseFileService.download(household, fileId);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(metadata.contentType()))
                .contentLength(stored.size())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(metadata.filename()).build().toString())
                .body(new InputStreamResource(stored.data()));
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<Void> delete(@PathVariable UUID householdId, @PathVariable UUID fileId) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        houseFileService.delete(household, SecurityUtils.getCurrentUser(), fileId);
        return ResponseEntity.noContent().build();
    }
}
