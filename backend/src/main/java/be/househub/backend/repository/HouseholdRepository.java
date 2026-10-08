package be.househub.backend.repository;

import be.househub.backend.entity.Household;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface HouseholdRepository extends JpaRepository<Household, UUID> {
}
