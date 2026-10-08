package be.househub.backend.dto.admin;

import be.househub.backend.dto.household.HouseholdMembershipResponse;
import be.househub.backend.dto.task.TaskResponse;
import be.househub.backend.entity.Role;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UserDetailResponse(
        UUID id,
        String email,
        String displayName,
        Role role,
        boolean emailVerified,
        Instant createdAt,
        List<HouseholdMembershipResponse> households,
        List<TaskResponse> assignedTasks
) {
}
