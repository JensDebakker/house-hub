package be.househub.backend.controller;

import be.househub.backend.dto.admin.AdminUpdateUserRequest;
import be.househub.backend.dto.admin.AdminUserResponse;
import be.househub.backend.dto.household.HouseholdResponse;
import be.househub.backend.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
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

    @GetMapping("/households")
    public List<HouseholdResponse> listHouseholds() {
        return adminService.listHouseholds();
    }

    @PatchMapping("/users/{userId}")
    public AdminUserResponse updateUser(@PathVariable UUID userId, @RequestBody AdminUpdateUserRequest request) {
        return adminService.updateUser(userId, request);
    }
}
