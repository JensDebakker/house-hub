package be.househub.backend.controller;

import be.househub.backend.dto.task.TaskRequest;
import be.househub.backend.dto.task.TaskResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.security.SecurityUtils;
import be.househub.backend.service.HouseholdAccessService;
import be.househub.backend.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/households/{householdId}/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final HouseholdAccessService householdAccessService;

    @GetMapping
    public List<TaskResponse> findAll(@PathVariable UUID householdId) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        return taskService.findAll(household);
    }

    @PostMapping
    public ResponseEntity<TaskResponse> create(@PathVariable UUID householdId, @Valid @RequestBody TaskRequest request) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        TaskResponse created = taskService.create(household, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public TaskResponse update(@PathVariable UUID householdId, @PathVariable UUID id, @Valid @RequestBody TaskRequest request) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        return taskService.update(household, id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID householdId, @PathVariable UUID id) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        taskService.delete(household, id);
        return ResponseEntity.noContent().build();
    }
}
