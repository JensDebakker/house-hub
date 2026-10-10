package be.househub.backend.repository;

import be.househub.backend.entity.FeedbackTicket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FeedbackTicketRepository extends JpaRepository<FeedbackTicket, UUID> {

    List<FeedbackTicket> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<FeedbackTicket> findByIdAndUserId(UUID id, UUID userId);

    List<FeedbackTicket> findAllByOrderByCreatedAtDesc();
}
