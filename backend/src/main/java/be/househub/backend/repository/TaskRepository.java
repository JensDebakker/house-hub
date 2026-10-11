package be.househub.backend.repository;

import be.househub.backend.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {

    List<Task> findByHouseholdId(UUID householdId);

    Optional<Task> findByIdAndHouseholdId(UUID id, UUID householdId);

    List<Task> findByAssignedToId(UUID assignedToId);

    long countByHouseholdId(UUID householdId);

    void deleteByHouseholdId(UUID householdId);
}
