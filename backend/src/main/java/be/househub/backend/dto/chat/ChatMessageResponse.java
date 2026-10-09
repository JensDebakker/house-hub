package be.househub.backend.dto.chat;

import java.time.Instant;
import java.util.UUID;

public record ChatMessageResponse(
        UUID id,
        UUID householdId,
        UUID senderId,
        String senderDisplayName,
        String text,
        Instant createdAt
) {
}
