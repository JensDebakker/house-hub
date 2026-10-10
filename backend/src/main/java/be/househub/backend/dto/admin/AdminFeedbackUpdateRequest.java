package be.househub.backend.dto.admin;

import be.househub.backend.entity.FeedbackStatus;

public record AdminFeedbackUpdateRequest(
        FeedbackStatus status
) {
}
