package be.househub.backend.service;

import be.househub.backend.dto.file.CreateFolderRequest;
import be.househub.backend.entity.HouseFile;
import be.househub.backend.entity.HouseFolder;
import be.househub.backend.entity.Household;
import be.househub.backend.entity.User;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.HouseFileRepository;
import be.househub.backend.repository.HouseFolderRepository;
import be.househub.backend.service.storage.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.security.access.AccessDeniedException;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HouseFolderServiceTest {

    @Mock
    private HouseFolderRepository houseFolderRepository;
    @Mock
    private HouseFileRepository houseFileRepository;
    @Mock
    private FileStorageService fileStorageService;
    @Mock
    private HouseholdAccessService householdAccessService;

    private HouseFolderService houseFolderService;

    @BeforeEach
    void setUp() {
        houseFolderService = new HouseFolderService(houseFolderRepository, houseFileRepository, fileStorageService, householdAccessService);
    }

    private Household household() {
        Household household = new Household();
        household.setId(UUID.randomUUID());
        return household;
    }

    private User user() {
        User user = new User();
        user.setId(UUID.randomUUID());
        return user;
    }

    private HouseFolder folder(Household household, User creator) {
        HouseFolder folder = new HouseFolder();
        folder.setId(UUID.randomUUID());
        folder.setHousehold(household);
        folder.setCreatedBy(creator);
        return folder;
    }

    @Test
    void createFolder_withUnknownParent_throwsNotFound() {
        Household household = household();
        UUID parentId = UUID.randomUUID();
        when(houseFolderRepository.findByIdAndHouseholdId(parentId, household.getId())).thenReturn(Optional.empty());

        CreateFolderRequest request = new CreateFolderRequest("Docs", parentId);

        assertThatThrownBy(() -> houseFolderService.createFolder(household, user(), request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void deleteFolder_creator_allowed() {
        Household household = household();
        User creator = user();
        HouseFolder target = folder(household, creator);
        when(houseFolderRepository.findByIdAndHouseholdId(target.getId(), household.getId())).thenReturn(Optional.of(target));
        // householdAccessService.requireOwnerOrCreator is mocked to no-op (creator allowed)
        when(houseFolderRepository.findChildren(household.getId(), target.getId())).thenReturn(List.of());
        when(houseFileRepository.findChildren(household.getId(), target.getId())).thenReturn(List.of());

        assertThatCode(() -> houseFolderService.deleteFolder(household, creator, target.getId())).doesNotThrowAnyException();

        verify(houseFolderRepository).delete(target);
    }

    @Test
    void deleteFolder_otherMember_throwsAccessDenied() {
        Household household = household();
        User creator = user();
        User otherMember = user();
        HouseFolder target = folder(household, creator);
        when(houseFolderRepository.findByIdAndHouseholdId(target.getId(), household.getId())).thenReturn(Optional.of(target));
        doThrow(new AccessDeniedException("Only the household owner or the folder's creator can delete this folder"))
                .when(householdAccessService)
                .requireOwnerOrCreator(otherMember, household, creator.getId(),
                        "Only the household owner or the folder's creator can delete this folder");

        assertThatThrownBy(() -> houseFolderService.deleteFolder(household, otherMember, target.getId()))
                .isInstanceOf(AccessDeniedException.class);

        verify(houseFolderRepository, never()).delete(any());
    }

    @Test
    void deleteFolder_recursivelyDeletesNestedFilesAndSubfolders() {
        Household household = household();
        User owner = user();
        HouseFolder root = folder(household, owner);
        HouseFolder child = folder(household, owner);

        HouseFile rootFile = new HouseFile();
        rootFile.setId(UUID.randomUUID());
        rootFile.setStorageKey("root-key");

        HouseFile childFile = new HouseFile();
        childFile.setId(UUID.randomUUID());
        childFile.setStorageKey("child-key");

        when(houseFolderRepository.findByIdAndHouseholdId(root.getId(), household.getId())).thenReturn(Optional.of(root));
        // householdAccessService.requireOwnerOrCreator is mocked to no-op (owner allowed)

        // subtree traversal: root's children = [child], child's children = []
        when(houseFolderRepository.findChildren(household.getId(), root.getId())).thenReturn(List.of(child));
        when(houseFolderRepository.findChildren(household.getId(), child.getId())).thenReturn(List.of());

        when(houseFileRepository.findChildren(household.getId(), root.getId())).thenReturn(List.of(rootFile));
        when(houseFileRepository.findChildren(household.getId(), child.getId())).thenReturn(List.of(childFile));

        when(houseFolderRepository.findByIdAndHouseholdId(child.getId(), household.getId())).thenReturn(Optional.of(child));

        houseFolderService.deleteFolder(household, owner, root.getId());

        verify(fileStorageService).delete("root-key");
        verify(fileStorageService).delete("child-key");
        verify(houseFolderRepository).delete(root);
        verify(houseFolderRepository).delete(child);
    }
}
