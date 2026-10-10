package be.househub.backend.dto.feedback;

import java.util.UUID;

public record FeedbackAttachmentResponse(
        UUID id,
        String contentType,
        String originalFilename
) {
}
