package be.househub.backend.repository;

import be.househub.backend.entity.FeedbackAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface FeedbackAttachmentRepository extends JpaRepository<FeedbackAttachment, UUID> {

    Optional<FeedbackAttachment> findByIdAndTicketId(UUID id, UUID ticketId);
}
