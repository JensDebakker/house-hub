package be.househub.backend.repository;

import be.househub.backend.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    List<ChatMessage> findByHouseholdIdOrderByCreatedAtDesc(UUID householdId, Pageable pageable);

    List<ChatMessage> findByHouseholdIdAndCreatedAtBeforeOrderByCreatedAtDesc(
            UUID householdId, Instant before, Pageable pageable);

    Optional<ChatMessage> findByIdAndHouseholdId(UUID id, UUID householdId);

    void deleteByHouseholdId(UUID householdId);
}
