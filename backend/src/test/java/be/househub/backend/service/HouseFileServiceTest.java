package be.househub.backend.service;

import be.househub.backend.entity.Household;
import be.househub.backend.entity.HouseFile;
import be.househub.backend.entity.User;
import be.househub.backend.repository.HouseFileRepository;
import be.househub.backend.repository.HouseFolderRepository;
import be.househub.backend.service.storage.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import org.springframework.security.access.AccessDeniedException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;

@ExtendWith(MockitoExtension.class)
class HouseFileServiceTest {

    @Mock
    private HouseFileRepository houseFileRepository;
    @Mock
    private HouseFolderRepository houseFolderRepository;
    @Mock
    private FileStorageService fileStorageService;
    @Mock
    private HouseholdAccessService householdAccessService;

    private HouseFileService houseFileService;

    @BeforeEach
    void setUp() {
        houseFileService = new HouseFileService(houseFileRepository, houseFolderRepository, fileStorageService, householdAccessService);
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

    private HouseFile fileUploadedBy(Household household, User uploader) {
        HouseFile file = new HouseFile();
        file.setId(UUID.randomUUID());
        file.setHousehold(household);
        file.setUploadedBy(uploader);
        file.setStorageKey("key");
        return file;
    }

    @Test
    void delete_owner_allowedRegardlessOfUploader() {
        Household household = household();
        User owner = user();
        User uploader = user();
        HouseFile file = fileUploadedBy(household, uploader);
        when(houseFileRepository.findByIdAndHouseholdId(file.getId(), household.getId())).thenReturn(Optional.of(file));
        when(householdAccessService.isOwner(owner, household.getId())).thenReturn(true);

        assertThatCode(() -> houseFileService.delete(household, owner, file.getId())).doesNotThrowAnyException();

        verify(fileStorageService).delete("key");
        verify(houseFileRepository).delete(file);
    }

    @Test
    void delete_originalUploader_allowed() {
        Household household = household();
        User uploader = user();
        HouseFile file = fileUploadedBy(household, uploader);
        when(houseFileRepository.findByIdAndHouseholdId(file.getId(), household.getId())).thenReturn(Optional.of(file));
        when(householdAccessService.isOwner(uploader, household.getId())).thenReturn(false);

        assertThatCode(() -> houseFileService.delete(household, uploader, file.getId())).doesNotThrowAnyException();

        verify(fileStorageService).delete("key");
    }

    @Test
    void delete_otherMember_throwsAccessDenied() {
        Household household = household();
        User uploader = user();
        User otherMember = user();
        HouseFile file = fileUploadedBy(household, uploader);
        when(houseFileRepository.findByIdAndHouseholdId(file.getId(), household.getId())).thenReturn(Optional.of(file));
        when(householdAccessService.isOwner(otherMember, household.getId())).thenReturn(false);

        assertThatThrownBy(() -> houseFileService.delete(household, otherMember, file.getId()))
                .isInstanceOf(AccessDeniedException.class);

        verify(fileStorageService, never()).delete(any());
        verify(houseFileRepository, never()).delete(any());
    }
}
