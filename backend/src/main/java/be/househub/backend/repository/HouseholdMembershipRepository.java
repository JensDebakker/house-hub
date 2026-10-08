package be.househub.backend.repository;

import be.househub.backend.entity.HouseholdMembership;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HouseholdMembershipRepository extends JpaRepository<HouseholdMembership, UUID> {

    List<HouseholdMembership> findByUserId(UUID userId);

    List<HouseholdMembership> findByHouseholdId(UUID householdId);

    Optional<HouseholdMembership> findByUserIdAndHouseholdId(UUID userId, UUID householdId);

    boolean existsByUserIdAndHouseholdId(UUID userId, UUID householdId);

    long countByHouseholdId(UUID householdId);

    void deleteByUserIdAndHouseholdId(UUID userId, UUID householdId);
}
