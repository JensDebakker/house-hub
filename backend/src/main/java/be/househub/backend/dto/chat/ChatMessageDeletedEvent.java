package be.househub.backend.dto.chat;

import java.util.UUID;

/**
 * Broadcast over the {@code chat} websocket channel when a message is deleted. Deliberately
 * a different, minimal shape from {@link ChatMessageResponse} — clients tell "created" and
 * "deleted" events on the same channel apart by checking for the presence of
 * {@code deletedId}.
 */
public record ChatMessageDeletedEvent(UUID deletedId, UUID householdId) {
}
