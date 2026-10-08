package be.househub.backend.repository;

import be.househub.backend.entity.ShoppingListItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ShoppingListItemRepository extends JpaRepository<ShoppingListItem, UUID> {
}
