package be.househub.backend.dto.push;

import java.util.UUID;

public record PushSubscriptionResponse(
        UUID id,
        String endpoint,
        boolean notifyOnVersion,
        boolean notifyOnChatMessage
) {
}
