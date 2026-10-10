package be.househub.backend.controller;

import be.househub.backend.dto.admin.AddMembershipRequest;
import be.househub.backend.dto.admin.AdminCalendarEventResponse;
import be.househub.backend.dto.admin.AdminCalendarEventUpdateRequest;
import be.househub.backend.dto.admin.AdminDatabaseHealthResponse;
import be.househub.backend.dto.admin.AdminDatabaseTableResponse;
import be.househub.backend.dto.admin.AdminFeedbackResponse;
import be.househub.backend.dto.admin.AdminFeedbackUpdateRequest;
import be.househub.backend.dto.admin.AdminShoppingListResponse;
import be.househub.backend.dto.admin.AdminShoppingListUpdateRequest;
import be.househub.backend.dto.admin.AdminSupplyResponse;
import be.househub.backend.dto.admin.AdminSupplyUpdateRequest;
import be.househub.backend.dto.admin.AdminTaskResponse;
import be.househub.backend.dto.admin.AdminTaskUpdateRequest;
import be.househub.backend.dto.admin.AdminUpdateUserRequest;
import be.househub.backend.dto.admin.AdminUserResponse;
import be.househub.backend.dto.admin.HouseholdDetailResponse;
import be.househub.backend.dto.admin.UpdateMembershipRequest;
import be.househub.backend.dto.admin.UserDetailResponse;
import be.househub.backend.dto.household.HouseholdMembershipResponse;
import be.househub.backend.dto.household.HouseholdResponse;
import be.househub.backend.dto.household.HouseholdUpdateRequest;
import be.househub.backend.service.AdminService;
import be.househub.backend.service.DatabaseDiagnosticsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final DatabaseDiagnosticsService databaseDiagnosticsService;

    @GetMapping("/users")
    public List<AdminUserResponse> listUsers() {
        return adminService.listUsers();
    }

    @GetMapping("/users/{userId}")
    public UserDetailResponse getUser(@PathVariable UUID userId) {
        return adminService.getUser(userId);
    }

    @PatchMapping("/users/{userId}")
    public AdminUserResponse updateUser(@PathVariable UUID userId, @RequestBody AdminUpdateUserRequest request) {
        return adminService.updateUser(userId, request);
    }

    @GetMapping("/households")
    public List<HouseholdResponse> listHouseholds() {
        return adminService.listHouseholds();
    }

    @GetMapping("/households/{householdId}")
    public HouseholdDetailResponse getHousehold(@PathVariable UUID householdId) {
        return adminService.getHousehold(householdId);
    }

    @PatchMapping("/households/{householdId}")
    public HouseholdResponse updateHousehold(@PathVariable UUID householdId, @RequestBody HouseholdUpdateRequest request) {
        return adminService.updateHousehold(householdId, request);
    }

    @PostMapping("/households/{householdId}/members")
    public ResponseEntity<HouseholdMembershipResponse> addMember(@PathVariable UUID householdId,
                                                                   @Valid @RequestBody AddMembershipRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.addMembership(householdId, request));
    }

    @PatchMapping("/households/{householdId}/members/{userId}")
    public HouseholdMembershipResponse updateMember(@PathVariable UUID householdId, @PathVariable UUID userId,
                                                      @Valid @RequestBody UpdateMembershipRequest request) {
        return adminService.updateMembership(householdId, userId, request);
    }

    @DeleteMapping("/households/{householdId}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable UUID householdId, @PathVariable UUID userId) {
        adminService.removeMembership(householdId, userId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/tasks/{taskId}")
    public AdminTaskResponse updateTask(@PathVariable UUID taskId, @RequestBody AdminTaskUpdateRequest request) {
        return adminService.updateTask(taskId, request);
    }

    @DeleteMapping("/tasks/{taskId}")
    public ResponseEntity<Void> deleteTask(@PathVariable UUID taskId) {
        adminService.deleteTask(taskId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/supplies/{supplyId}")
    public AdminSupplyResponse updateSupply(@PathVariable UUID supplyId, @RequestBody AdminSupplyUpdateRequest request) {
        return adminService.updateSupply(supplyId, request);
    }

    @DeleteMapping("/supplies/{supplyId}")
    public ResponseEntity<Void> deleteSupply(@PathVariable UUID supplyId) {
        adminService.deleteSupply(supplyId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/shopping-lists/{listId}")
    public AdminShoppingListResponse updateShoppingList(@PathVariable UUID listId, @RequestBody AdminShoppingListUpdateRequest request) {
        return adminService.updateShoppingList(listId, request);
    }

    @DeleteMapping("/shopping-lists/{listId}")
    public ResponseEntity<Void> deleteShoppingList(@PathVariable UUID listId) {
        adminService.deleteShoppingList(listId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/calendar-events/{eventId}")
    public AdminCalendarEventResponse updateCalendarEvent(@PathVariable UUID eventId, @RequestBody AdminCalendarEventUpdateRequest request) {
        return adminService.updateCalendarEvent(eventId, request);
    }

    @DeleteMapping("/calendar-events/{eventId}")
    public ResponseEntity<Void> deleteCalendarEvent(@PathVariable UUID eventId) {
        adminService.deleteCalendarEvent(eventId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/database/health")
    public AdminDatabaseHealthResponse databaseHealth() {
        return databaseDiagnosticsService.checkHealth();
    }

    @GetMapping("/database/schema")
    public List<AdminDatabaseTableResponse> databaseSchema() {
        return databaseDiagnosticsService.describeSchema();
    }

    @GetMapping("/feedback")
    public List<AdminFeedbackResponse> listFeedback() {
        return adminService.listFeedback();
    }

    @GetMapping("/feedback/{id}")
    public AdminFeedbackResponse getFeedback(@PathVariable UUID id) {
        return adminService.getFeedback(id);
    }

    @PatchMapping("/feedback/{id}")
    public AdminFeedbackResponse updateFeedback(@PathVariable UUID id, @RequestBody AdminFeedbackUpdateRequest request) {
        return adminService.updateFeedback(id, request);
    }

    @GetMapping("/feedback/{id}/attachments/{attachmentId}")
    public ResponseEntity<InputStreamResource> downloadFeedbackAttachment(@PathVariable UUID id, @PathVariable UUID attachmentId) {
        var file = adminService.downloadFeedbackAttachment(id, attachmentId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .contentLength(file.file().size())
                .body(new InputStreamResource(file.file().data()));
    }
}
