package be.househub.backend.repository;

import be.househub.backend.entity.ShoppingList;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ShoppingListRepository extends JpaRepository<ShoppingList, UUID> {

    List<ShoppingList> findByHouseholdId(UUID householdId);

    Optional<ShoppingList> findByIdAndHouseholdId(UUID id, UUID householdId);

    long countByHouseholdId(UUID householdId);
}
