package be.househub.backend.controller;

import be.househub.backend.dto.admin.AddMembershipRequest;
import be.househub.backend.dto.admin.AdminUpdateUserRequest;
import be.househub.backend.dto.admin.AdminUserResponse;
import be.househub.backend.dto.admin.HouseholdDetailResponse;
import be.househub.backend.dto.admin.UpdateMembershipRequest;
import be.househub.backend.dto.admin.UserDetailResponse;
import be.househub.backend.dto.household.HouseholdMembershipResponse;
import be.househub.backend.dto.household.HouseholdResponse;
import be.househub.backend.dto.household.HouseholdUpdateRequest;
import be.househub.backend.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
}
