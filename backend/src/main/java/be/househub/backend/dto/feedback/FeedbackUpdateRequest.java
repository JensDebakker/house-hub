package be.househub.backend.dto.feedback;

import be.househub.backend.entity.FeedbackType;

/**
 * Partial update of the caller's own feedback ticket. Both fields are optional; only the
 * provided (non-null) ones are changed.
 */
public record FeedbackUpdateRequest(
        FeedbackType type,
        String description
) {
}
