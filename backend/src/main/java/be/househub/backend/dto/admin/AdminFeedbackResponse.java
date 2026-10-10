package be.househub.backend.dto.admin;

import be.househub.backend.dto.feedback.FeedbackAttachmentResponse;
import be.househub.backend.entity.FeedbackStatus;
import be.househub.backend.entity.FeedbackType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AdminFeedbackResponse(
        UUID id,
        FeedbackType type,
        String description,
        FeedbackStatus status,
        Instant createdAt,
        Instant updatedAt,
        UUID userId,
        String userEmail,
        String userDisplayName,
        List<FeedbackAttachmentResponse> attachments
) {
}
