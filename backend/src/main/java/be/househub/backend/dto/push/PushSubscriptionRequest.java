package be.househub.backend.dto.push;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PushSubscriptionRequest(
        @NotBlank String endpoint,
        @NotNull @Valid Keys keys,
        boolean notifyOnVersion,
        boolean notifyOnChatMessage
) {
    public record Keys(
            @NotBlank String p256dh,
            @NotBlank String auth
    ) {
    }
}
