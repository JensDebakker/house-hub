package be.househub.backend.service;

import be.househub.backend.entity.Household;
import be.househub.backend.entity.HouseholdMembership;
import be.househub.backend.entity.HouseholdRole;
import be.househub.backend.entity.Role;
import be.househub.backend.entity.User;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.HouseholdMembershipRepository;
import be.househub.backend.repository.HouseholdRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import org.springframework.security.access.AccessDeniedException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HouseholdAccessServiceTest {

    @Mock
    private HouseholdRepository householdRepository;
    @Mock
    private HouseholdMembershipRepository membershipRepository;

    private HouseholdAccessService householdAccessService;

    @BeforeEach
    void setUp() {
        householdAccessService = new HouseholdAccessService(householdRepository, membershipRepository);
    }

    private User userWithRole(Role role) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setRole(role);
        return user;
    }

    private Household household(UUID id) {
        Household household = new Household();
        household.setId(id);
        return household;
    }

    @Test
    void requireAccess_unknownHousehold_throwsNotFound() {
        UUID householdId = UUID.randomUUID();
        when(householdRepository.findById(householdId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> householdAccessService.requireAccess(userWithRole(Role.USER), householdId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void requireAccess_admin_bypassesMembershipCheck() {
        UUID householdId = UUID.randomUUID();
        when(householdRepository.findById(householdId)).thenReturn(Optional.of(household(householdId)));

        Household result = householdAccessService.requireAccess(userWithRole(Role.ADMIN), householdId);

        assertThat(result.getId()).isEqualTo(householdId);
    }

    @Test
    void requireAccess_member_allowed() {
        UUID householdId = UUID.randomUUID();
        User user = userWithRole(Role.USER);
        when(householdRepository.findById(householdId)).thenReturn(Optional.of(household(householdId)));
        when(membershipRepository.existsByUserIdAndHouseholdId(user.getId(), householdId)).thenReturn(true);

        Household result = householdAccessService.requireAccess(user, householdId);

        assertThat(result.getId()).isEqualTo(householdId);
    }

    @Test
    void requireAccess_nonMember_throwsForbidden() {
        UUID householdId = UUID.randomUUID();
        User user = userWithRole(Role.USER);
        when(householdRepository.findById(householdId)).thenReturn(Optional.of(household(householdId)));
        when(membershipRepository.existsByUserIdAndHouseholdId(user.getId(), householdId)).thenReturn(false);

        assertThatThrownBy(() -> householdAccessService.requireAccess(user, householdId))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void requireOwner_admin_bypassesOwnerCheck() {
        UUID householdId = UUID.randomUUID();
        when(householdRepository.findById(householdId)).thenReturn(Optional.of(household(householdId)));

        Household result = householdAccessService.requireOwner(userWithRole(Role.ADMIN), householdId);

        assertThat(result.getId()).isEqualTo(householdId);
    }

    @Test
    void requireOwner_ownerMember_allowed() {
        UUID householdId = UUID.randomUUID();
        User user = userWithRole(Role.USER);
        HouseholdMembership membership = new HouseholdMembership();
        membership.setRole(HouseholdRole.OWNER);
        when(householdRepository.findById(householdId)).thenReturn(Optional.of(household(householdId)));
        when(membershipRepository.findByUserIdAndHouseholdId(user.getId(), householdId)).thenReturn(Optional.of(membership));

        Household result = householdAccessService.requireOwner(user, householdId);

        assertThat(result.getId()).isEqualTo(householdId);
    }

    @Test
    void requireOwner_regularMember_throwsForbidden() {
        UUID householdId = UUID.randomUUID();
        User user = userWithRole(Role.USER);
        HouseholdMembership membership = new HouseholdMembership();
        membership.setRole(HouseholdRole.MEMBER);
        when(householdRepository.findById(householdId)).thenReturn(Optional.of(household(householdId)));
        when(membershipRepository.findByUserIdAndHouseholdId(user.getId(), householdId)).thenReturn(Optional.of(membership));

        assertThatThrownBy(() -> householdAccessService.requireOwner(user, householdId))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void requireOwner_notAMember_throwsForbidden() {
        UUID householdId = UUID.randomUUID();
        User user = userWithRole(Role.USER);
        when(householdRepository.findById(householdId)).thenReturn(Optional.of(household(householdId)));
        when(membershipRepository.findByUserIdAndHouseholdId(user.getId(), householdId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> householdAccessService.requireOwner(user, householdId))
                .isInstanceOf(AccessDeniedException.class);
    }
}
