package be.househub.backend.repository;

import be.househub.backend.entity.CalendarEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CalendarEventRepository extends JpaRepository<CalendarEvent, UUID> {

    List<CalendarEvent> findByHouseholdId(UUID householdId);

    Optional<CalendarEvent> findByIdAndHouseholdId(UUID id, UUID householdId);

    long countByHouseholdId(UUID householdId);

    void deleteByHouseholdId(UUID householdId);
}
