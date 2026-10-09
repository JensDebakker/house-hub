package be.househub.backend.service;

import be.househub.backend.entity.Household;
import be.househub.backend.entity.HouseholdRole;
import be.househub.backend.entity.Role;
import be.househub.backend.entity.User;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.HouseholdMembershipRepository;
import be.househub.backend.repository.HouseholdRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HouseholdAccessService {

    private final HouseholdRepository householdRepository;
    private final HouseholdMembershipRepository membershipRepository;

    public Household requireAccess(User currentUser, UUID householdId) {
        Household household = householdRepository.findById(householdId)
                .orElseThrow(() -> new ResourceNotFoundException("Household", householdId));

        if (currentUser.getRole() == Role.ADMIN) {
            return household;
        }

        boolean isMember = membershipRepository.existsByUserIdAndHouseholdId(currentUser.getId(), householdId);
        if (!isMember) {
            throw new AccessDeniedException("You are not a member of this household");
        }

        return household;
    }

    public Household requireOwner(User currentUser, UUID householdId) {
        Household household = householdRepository.findById(householdId)
                .orElseThrow(() -> new ResourceNotFoundException("Household", householdId));

        if (currentUser.getRole() == Role.ADMIN) {
            return household;
        }

        boolean isOwner = membershipRepository.findByUserIdAndHouseholdId(currentUser.getId(), householdId)
                .map(membership -> membership.getRole() == HouseholdRole.OWNER)
                .orElse(false);
        if (!isOwner) {
            throw new AccessDeniedException("You must be an owner of this household");
        }

        return household;
    }
}
