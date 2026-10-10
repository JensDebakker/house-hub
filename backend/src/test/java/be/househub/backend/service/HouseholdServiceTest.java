package be.househub.backend.service;

import be.househub.backend.dto.admin.HouseholdMemberResponse;
import be.househub.backend.dto.household.HouseholdResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.entity.HouseFile;
import be.househub.backend.entity.HouseFolder;
import be.househub.backend.entity.HouseholdMembership;
import be.househub.backend.entity.HouseholdRole;
import be.househub.backend.entity.User;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.CalendarEventRepository;
import be.househub.backend.repository.ChatMessageRepository;
import be.househub.backend.repository.HouseFileRepository;
import be.househub.backend.repository.HouseFolderRepository;
import be.househub.backend.repository.HouseholdMembershipRepository;
import be.househub.backend.repository.HouseholdRepository;
import be.househub.backend.repository.ShoppingListRepository;
import be.househub.backend.repository.SupplyRepository;
import be.househub.backend.repository.TaskRepository;
import be.househub.backend.repository.UserRepository;
import be.househub.backend.service.storage.FileStorageService;
import be.househub.backend.websocket.SessionRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HouseholdServiceTest {

    @Mock
    private HouseholdRepository householdRepository;
    @Mock
    private HouseholdMembershipRepository membershipRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private TaskRepository taskRepository;
    @Mock
    private SupplyRepository supplyRepository;
    @Mock
    private ShoppingListRepository shoppingListRepository;
    @Mock
    private CalendarEventRepository calendarEventRepository;
    @Mock
    private HouseFileRepository houseFileRepository;
    @Mock
    private HouseFolderRepository houseFolderRepository;
    @Mock
    private ChatMessageRepository chatMessageRepository;
    @Mock
    private FileStorageService fileStorageService;
    @Mock
    private SessionRegistry sessionRegistry;

    private HouseholdService householdService;

    @BeforeEach
    void setUp() {
        householdService = new HouseholdService(
                householdRepository, membershipRepository, userRepository, taskRepository,
                supplyRepository, shoppingListRepository, calendarEventRepository, houseFileRepository,
                houseFolderRepository, chatMessageRepository, fileStorageService, sessionRegistry);
    }

    private User userWithId() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setDisplayName("Alice");
        user.setEmail("alice@example.com");
        return user;
    }

    private Household householdWithId() {
        Household household = new Household();
        household.setId(UUID.randomUUID());
        household.setName("The Smiths");
        household.setInviteCode("ABCD1234");
        return household;
    }

    @Test
    void generateInviteCode_retriesUntilUnique() {
        when(householdRepository.existsByInviteCode(anyString())).thenReturn(true, true, false);

        String code = householdService.generateInviteCode();

        assertThat(code).hasSize(8);
        verify(householdRepository, org.mockito.Mockito.times(3)).existsByInviteCode(anyString());
    }

    @Test
    void createHousehold_savesHouseholdAndOwnerMembership() {
        User owner = userWithId();
        when(householdRepository.existsByInviteCode(anyString())).thenReturn(false);
        when(householdRepository.save(any(Household.class))).thenAnswer(invocation -> {
            Household h = invocation.getArgument(0);
            h.setId(UUID.randomUUID());
            return h;
        });
        stubEmptyCounts();

        HouseholdResponse response = householdService.createHousehold(owner, "New Household");

        assertThat(response.name()).isEqualTo("New Household");

        org.mockito.ArgumentCaptor<HouseholdMembership> captor = org.mockito.ArgumentCaptor.forClass(HouseholdMembership.class);
        verify(membershipRepository).save(captor.capture());
        assertThat(captor.getValue().getUser()).isEqualTo(owner);
        assertThat(captor.getValue().getRole()).isEqualTo(HouseholdRole.OWNER);
    }

    @Test
    void joinHousehold_normalizesCodeAndCreatesMembership() {
        User user = userWithId();
        Household household = householdWithId();
        when(householdRepository.findByInviteCode("ABCD1234")).thenReturn(Optional.of(household));
        when(membershipRepository.existsByUserIdAndHouseholdId(user.getId(), household.getId())).thenReturn(false);
        stubEmptyCounts();

        HouseholdResponse response = householdService.joinHousehold(user, "  abcd1234  ");

        assertThat(response.id()).isEqualTo(household.getId());
        org.mockito.ArgumentCaptor<HouseholdMembership> captor = org.mockito.ArgumentCaptor.forClass(HouseholdMembership.class);
        verify(membershipRepository).save(captor.capture());
        assertThat(captor.getValue().getRole()).isEqualTo(HouseholdRole.MEMBER);
        assertThat(captor.getValue().getUser()).isEqualTo(user);
    }

    @Test
    void joinHousehold_unknownCode_throwsNotFound() {
        User user = userWithId();
        when(householdRepository.findByInviteCode("NOPE0000")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> householdService.joinHousehold(user, "nope0000"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void joinHousehold_alreadyMember_throwsConflict() {
        User user = userWithId();
        Household household = householdWithId();
        when(householdRepository.findByInviteCode("ABCD1234")).thenReturn(Optional.of(household));
        when(membershipRepository.existsByUserIdAndHouseholdId(user.getId(), household.getId())).thenReturn(true);

        assertThatThrownBy(() -> householdService.joinHousehold(user, "ABCD1234"))
                .isInstanceOf(IllegalStateException.class);

        verify(membershipRepository, never()).save(any());
    }

    @Test
    void leaveHousehold_soleMember_deletesMembership() {
        User user = userWithId();
        Household household = householdWithId();
        HouseholdMembership membership = membership(user, household, HouseholdRole.OWNER);
        when(membershipRepository.findByUserIdAndHouseholdId(user.getId(), household.getId()))
                .thenReturn(Optional.of(membership));
        when(membershipRepository.countByHouseholdId(household.getId())).thenReturn(1L);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        householdService.leaveHousehold(user, household.getId());

        verify(membershipRepository).deleteByUserIdAndHouseholdId(user.getId(), household.getId());
    }

    @Test
    void leaveHousehold_regularMemberAmongMany_alwaysAllowed() {
        User user = userWithId();
        Household household = householdWithId();
        HouseholdMembership membership = membership(user, household, HouseholdRole.MEMBER);
        when(membershipRepository.findByUserIdAndHouseholdId(user.getId(), household.getId()))
                .thenReturn(Optional.of(membership));
        when(membershipRepository.countByHouseholdId(household.getId())).thenReturn(3L);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        householdService.leaveHousehold(user, household.getId());

        verify(membershipRepository).deleteByUserIdAndHouseholdId(user.getId(), household.getId());
    }

    @Test
    void leaveHousehold_ownerWithAnotherOwner_allowed() {
        User user = userWithId();
        Household household = householdWithId();
        HouseholdMembership membership = membership(user, household, HouseholdRole.OWNER);
        User otherOwnerUser = userWithId();
        HouseholdMembership otherOwner = membership(otherOwnerUser, household, HouseholdRole.OWNER);
        when(membershipRepository.findByUserIdAndHouseholdId(user.getId(), household.getId()))
                .thenReturn(Optional.of(membership));
        when(membershipRepository.countByHouseholdId(household.getId())).thenReturn(2L);
        when(membershipRepository.findByHouseholdId(household.getId())).thenReturn(List.of(membership, otherOwner));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        householdService.leaveHousehold(user, household.getId());

        verify(membershipRepository).deleteByUserIdAndHouseholdId(user.getId(), household.getId());
    }

    @Test
    void leaveHousehold_lastOwner_throwsConflict() {
        User user = userWithId();
        Household household = householdWithId();
        HouseholdMembership membership = membership(user, household, HouseholdRole.OWNER);
        User otherMemberUser = userWithId();
        HouseholdMembership otherMember = membership(otherMemberUser, household, HouseholdRole.MEMBER);
        when(membershipRepository.findByUserIdAndHouseholdId(user.getId(), household.getId()))
                .thenReturn(Optional.of(membership));
        when(membershipRepository.countByHouseholdId(household.getId())).thenReturn(2L);
        when(membershipRepository.findByHouseholdId(household.getId())).thenReturn(List.of(membership, otherMember));

        assertThatThrownBy(() -> householdService.leaveHousehold(user, household.getId()))
                .isInstanceOf(IllegalStateException.class);

        verify(membershipRepository, never()).deleteByUserIdAndHouseholdId(any(), any());
    }

    @Test
    void removeMember_existingMember_deletes() {
        UUID householdId = UUID.randomUUID();
        User user = userWithId();
        UUID userId = user.getId();
        when(membershipRepository.existsByUserIdAndHouseholdId(userId, householdId)).thenReturn(true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        householdService.removeMember(householdId, userId);

        verify(membershipRepository).deleteByUserIdAndHouseholdId(userId, householdId);
        verify(userRepository, never()).save(any());
    }

    @Test
    void removeMember_removedFromDefaultHousehold_promotesAnotherMembership() {
        User user = userWithId();
        Household household = householdWithId();
        Household otherHousehold = householdWithId();
        user.setDefaultHousehold(household);
        when(membershipRepository.existsByUserIdAndHouseholdId(user.getId(), household.getId())).thenReturn(true);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(membershipRepository.findByUserId(user.getId()))
                .thenReturn(List.of(membership(user, otherHousehold, HouseholdRole.MEMBER)));

        householdService.removeMember(household.getId(), user.getId());

        verify(membershipRepository).deleteByUserIdAndHouseholdId(user.getId(), household.getId());
        assertThat(user.getDefaultHousehold()).isEqualTo(otherHousehold);
        verify(userRepository).save(user);
    }

    @Test
    void removeMember_removedFromDefaultHousehold_withMultipleRemaining_prefersOwnerOverEarlierJoinedMember() {
        User user = userWithId();
        Household household = householdWithId();
        Household earlierMemberHousehold = householdWithId();
        Household laterOwnerHousehold = householdWithId();
        user.setDefaultHousehold(household);
        when(membershipRepository.existsByUserIdAndHouseholdId(user.getId(), household.getId())).thenReturn(true);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        HouseholdMembership earlierMember = membership(user, earlierMemberHousehold, HouseholdRole.MEMBER);
        earlierMember.setJoinedAt(java.time.Instant.parse("2020-01-01T00:00:00Z"));
        HouseholdMembership laterOwner = membership(user, laterOwnerHousehold, HouseholdRole.OWNER);
        laterOwner.setJoinedAt(java.time.Instant.parse("2021-01-01T00:00:00Z"));
        when(membershipRepository.findByUserId(user.getId())).thenReturn(List.of(earlierMember, laterOwner));

        householdService.removeMember(household.getId(), user.getId());

        assertThat(user.getDefaultHousehold()).isEqualTo(laterOwnerHousehold);
    }

    @Test
    void removeMember_removedFromNonDefaultHousehold_leavesDefaultUntouched() {
        User user = userWithId();
        Household household = householdWithId();
        Household defaultHousehold = householdWithId();
        user.setDefaultHousehold(defaultHousehold);
        when(membershipRepository.existsByUserIdAndHouseholdId(user.getId(), household.getId())).thenReturn(true);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        householdService.removeMember(household.getId(), user.getId());

        assertThat(user.getDefaultHousehold()).isEqualTo(defaultHousehold);
        verify(userRepository, never()).save(any());
    }

    @Test
    void removeMember_notAMember_throwsNotFound() {
        UUID householdId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(membershipRepository.existsByUserIdAndHouseholdId(userId, householdId)).thenReturn(false);

        assertThatThrownBy(() -> householdService.removeMember(householdId, userId))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(membershipRepository, never()).deleteByUserIdAndHouseholdId(any(), any());
    }

    @Test
    void leaveHousehold_leavingDefaultHousehold_promotesAnotherMembershipToDefault() {
        User user = userWithId();
        Household household = householdWithId();
        Household otherHousehold = householdWithId();
        user.setDefaultHousehold(household);
        HouseholdMembership membership = membership(user, household, HouseholdRole.MEMBER);
        HouseholdMembership otherMembership = membership(user, otherHousehold, HouseholdRole.OWNER);
        when(membershipRepository.findByUserIdAndHouseholdId(user.getId(), household.getId()))
                .thenReturn(Optional.of(membership));
        when(membershipRepository.countByHouseholdId(household.getId())).thenReturn(1L);
        when(membershipRepository.findByUserId(user.getId())).thenReturn(List.of(otherMembership));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        householdService.leaveHousehold(user, household.getId());

        assertThat(user.getDefaultHousehold()).isEqualTo(otherHousehold);
        verify(userRepository).save(user);
    }

    @Test
    void leaveHousehold_leavingDefaultHousehold_noOtherMemberships_clearsDefault() {
        User user = userWithId();
        Household household = householdWithId();
        user.setDefaultHousehold(household);
        HouseholdMembership membership = membership(user, household, HouseholdRole.OWNER);
        when(membershipRepository.findByUserIdAndHouseholdId(user.getId(), household.getId()))
                .thenReturn(Optional.of(membership));
        when(membershipRepository.countByHouseholdId(household.getId())).thenReturn(1L);
        when(membershipRepository.findByUserId(user.getId())).thenReturn(List.of());
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        householdService.leaveHousehold(user, household.getId());

        assertThat(user.getDefaultHousehold()).isNull();
        verify(userRepository).save(user);
    }

    @Test
    void leaveHousehold_notTheDefaultHousehold_leavesDefaultUntouched() {
        User user = userWithId();
        Household household = householdWithId();
        Household defaultHousehold = householdWithId();
        user.setDefaultHousehold(defaultHousehold);
        HouseholdMembership membership = membership(user, household, HouseholdRole.MEMBER);
        when(membershipRepository.findByUserIdAndHouseholdId(user.getId(), household.getId()))
                .thenReturn(Optional.of(membership));
        when(membershipRepository.countByHouseholdId(household.getId())).thenReturn(2L);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        householdService.leaveHousehold(user, household.getId());

        assertThat(user.getDefaultHousehold()).isEqualTo(defaultHousehold);
        verify(userRepository, never()).save(any());
    }

    @Test
    void setDefaultHousehold_memberOfHousehold_setsAndSaves() {
        User user = userWithId();
        Household household = householdWithId();
        HouseholdMembership membership = membership(user, household, HouseholdRole.MEMBER);
        when(membershipRepository.findByUserIdAndHouseholdId(user.getId(), household.getId()))
                .thenReturn(Optional.of(membership));

        householdService.setDefaultHousehold(user, household.getId());

        assertThat(user.getDefaultHousehold()).isEqualTo(household);
        verify(userRepository).save(user);
    }

    @Test
    void setDefaultHousehold_notAMember_throwsNotFound() {
        User user = userWithId();
        UUID householdId = UUID.randomUUID();
        when(membershipRepository.findByUserIdAndHouseholdId(user.getId(), householdId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> householdService.setDefaultHousehold(user, householdId))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void findMemberships_mapsCountsAndDefaultFlag() {
        User user = userWithId();
        Household household = householdWithId();
        Household otherHousehold = householdWithId();
        user.setDefaultHousehold(household);
        HouseholdMembership membership = membership(user, household, HouseholdRole.OWNER);
        HouseholdMembership otherMembership = membership(user, otherHousehold, HouseholdRole.MEMBER);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(membershipRepository.findByUserId(user.getId())).thenReturn(List.of(membership, otherMembership));
        when(membershipRepository.countByHouseholdId(household.getId())).thenReturn(3L);
        when(membershipRepository.countByHouseholdId(otherHousehold.getId())).thenReturn(1L);
        when(sessionRegistry.distinctUserCount(household.getId())).thenReturn(2L);
        when(sessionRegistry.distinctUserCount(otherHousehold.getId())).thenReturn(0L);

        List<be.househub.backend.dto.household.HouseholdMembershipResponse> result =
                householdService.findMemberships(user.getId());

        assertThat(result).hasSize(2);
        be.househub.backend.dto.household.HouseholdMembershipResponse first = result.stream()
                .filter(r -> r.householdId().equals(household.getId())).findFirst().orElseThrow();
        assertThat(first.memberCount()).isEqualTo(3L);
        assertThat(first.onlineCount()).isEqualTo(2L);
        assertThat(first.isDefault()).isTrue();

        be.househub.backend.dto.household.HouseholdMembershipResponse second = result.stream()
                .filter(r -> r.householdId().equals(otherHousehold.getId())).findFirst().orElseThrow();
        assertThat(second.memberCount()).isEqualTo(1L);
        assertThat(second.onlineCount()).isEqualTo(0L);
        assertThat(second.isDefault()).isFalse();
    }

    @Test
    void findMembers_mapsToResponseShape() {
        Household household = householdWithId();
        User user = userWithId();
        HouseholdMembership membership = membership(user, household, HouseholdRole.OWNER);
        when(membershipRepository.findByHouseholdId(household.getId())).thenReturn(List.of(membership));

        List<HouseholdMemberResponse> members = householdService.findMembers(household.getId());

        assertThat(members).hasSize(1);
        assertThat(members.get(0).userId()).isEqualTo(user.getId());
        assertThat(members.get(0).displayName()).isEqualTo(user.getDisplayName());
        assertThat(members.get(0).email()).isEqualTo(user.getEmail());
        assertThat(members.get(0).role()).isEqualTo(HouseholdRole.OWNER);
    }

    @Test
    void deleteHousehold_unknownId_throwsNotFound() {
        UUID householdId = UUID.randomUUID();
        when(householdRepository.findById(householdId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> householdService.deleteHousehold(householdId))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(householdRepository, never()).delete(any());
    }

    @Test
    void deleteHousehold_deletesFileBlobsAndEveryDependentRowBeforeTheHouseholdItself() {
        Household household = householdWithId();
        UUID householdId = household.getId();
        when(householdRepository.findById(householdId)).thenReturn(Optional.of(household));

        HouseFile file = new HouseFile();
        file.setId(UUID.randomUUID());
        file.setStorageKey("key-1");
        when(houseFileRepository.findByHouseholdId(householdId)).thenReturn(List.of(file));

        when(houseFolderRepository.findByHouseholdId(householdId)).thenReturn(List.of());
        when(shoppingListRepository.findByHouseholdId(householdId)).thenReturn(List.of());

        householdService.deleteHousehold(householdId);

        verify(fileStorageService).delete("key-1");
        verify(houseFileRepository).deleteAll(List.of(file));
        verify(taskRepository).deleteByHouseholdId(householdId);
        verify(supplyRepository).deleteByHouseholdId(householdId);
        verify(calendarEventRepository).deleteByHouseholdId(householdId);
        verify(chatMessageRepository).deleteByHouseholdId(householdId);
        verify(membershipRepository).deleteByHouseholdId(householdId);
        verify(householdRepository).delete(household);
    }

    @Test
    void deleteHousehold_nestedFolders_deletesChildrenBeforeParents() {
        Household household = householdWithId();
        UUID householdId = household.getId();
        when(householdRepository.findById(householdId)).thenReturn(Optional.of(household));
        when(houseFileRepository.findByHouseholdId(householdId)).thenReturn(List.of());
        when(shoppingListRepository.findByHouseholdId(householdId)).thenReturn(List.of());

        HouseFolder root = new HouseFolder();
        root.setId(UUID.randomUUID());
        HouseFolder child = new HouseFolder();
        child.setId(UUID.randomUUID());
        child.setParentFolder(root);
        when(houseFolderRepository.findByHouseholdId(householdId)).thenReturn(List.of(root, child));

        householdService.deleteHousehold(householdId);

        org.mockito.InOrder order = org.mockito.Mockito.inOrder(houseFolderRepository);
        order.verify(houseFolderRepository).deleteAll(List.of(child));
        order.verify(houseFolderRepository).deleteAll(List.of(root));
    }

    private HouseholdMembership membership(User user, Household household, HouseholdRole role) {
        HouseholdMembership membership = new HouseholdMembership();
        membership.setId(UUID.randomUUID());
        membership.setUser(user);
        membership.setHousehold(household);
        membership.setRole(role);
        return membership;
    }

    private void stubEmptyCounts() {
        when(taskRepository.countByHouseholdId(any())).thenReturn(0L);
        when(supplyRepository.countByHouseholdId(any())).thenReturn(0L);
        when(shoppingListRepository.countByHouseholdId(any())).thenReturn(0L);
        when(calendarEventRepository.countByHouseholdId(any())).thenReturn(0L);
        when(houseFileRepository.countByHouseholdId(any())).thenReturn(0L);
        when(houseFileRepository.sumSizeBytesByHouseholdId(any())).thenReturn(0L);
        when(membershipRepository.countByHouseholdId(any())).thenReturn(1L);
    }
}
