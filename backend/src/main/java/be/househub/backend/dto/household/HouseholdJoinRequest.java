package be.househub.backend.dto.household;

import jakarta.validation.constraints.NotBlank;

public record HouseholdJoinRequest(

        @NotBlank String inviteCode
) {
}
