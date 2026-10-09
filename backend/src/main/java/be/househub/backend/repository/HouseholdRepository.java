package be.househub.backend.repository;

import be.househub.backend.entity.Household;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface HouseholdRepository extends JpaRepository<Household, UUID> {

    boolean existsByInviteCode(String inviteCode);

    Optional<Household> findByInviteCode(String inviteCode);
}
