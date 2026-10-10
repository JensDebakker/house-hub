package be.househub.backend.dto.feedback;

import be.househub.backend.entity.FeedbackStatus;
import be.househub.backend.entity.FeedbackType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record FeedbackTicketResponse(
        UUID id,
        FeedbackType type,
        String description,
        FeedbackStatus status,
        Instant createdAt,
        Instant updatedAt,
        List<FeedbackAttachmentResponse> attachments
) {
}
