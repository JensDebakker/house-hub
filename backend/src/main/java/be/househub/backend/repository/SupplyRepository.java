package be.househub.backend.repository;

import be.househub.backend.entity.Supply;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SupplyRepository extends JpaRepository<Supply, UUID> {

    List<Supply> findByHouseholdId(UUID householdId);

    Optional<Supply> findByIdAndHouseholdId(UUID id, UUID householdId);

    long countByHouseholdId(UUID householdId);
}
