package be.househub.backend.controller;

import be.househub.backend.dto.file.CreateFolderRequest;
import be.househub.backend.dto.file.FolderContentsResponse;
import be.househub.backend.dto.file.HouseFolderResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.security.SecurityUtils;
import be.househub.backend.service.HouseFolderService;
import be.househub.backend.service.HouseholdAccessService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/households/{householdId}/folders")
@RequiredArgsConstructor
public class HouseFolderController {

    private final HouseFolderService houseFolderService;
    private final HouseholdAccessService householdAccessService;

    @GetMapping("/contents")
    public FolderContentsResponse getContents(@PathVariable UUID householdId,
            @RequestParam(required = false) UUID parentId) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        return houseFolderService.getContents(household, parentId);
    }

    @PostMapping
    public ResponseEntity<HouseFolderResponse> createFolder(@PathVariable UUID householdId,
            @Valid @RequestBody CreateFolderRequest request) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        HouseFolderResponse created = houseFolderService.createFolder(household, SecurityUtils.getCurrentUser(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/{folderId}")
    public ResponseEntity<Void> deleteFolder(@PathVariable UUID householdId, @PathVariable UUID folderId) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        houseFolderService.deleteFolder(household, SecurityUtils.getCurrentUser(), folderId);
        return ResponseEntity.noContent().build();
    }
}
