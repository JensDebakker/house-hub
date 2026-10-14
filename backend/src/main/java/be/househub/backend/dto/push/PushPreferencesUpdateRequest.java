package be.househub.backend.dto.push;

import jakarta.validation.constraints.NotBlank;

/** Partial update: only the preference field(s) actually present should change - {@code null}
 * means "leave as-is", not "set to false". */
public record PushPreferencesUpdateRequest(
        @NotBlank String endpoint,
        Boolean notifyOnVersion,
        Boolean notifyOnChatMessage
) {
}
