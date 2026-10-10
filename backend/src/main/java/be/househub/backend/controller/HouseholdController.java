package be.househub.backend.controller;

import be.househub.backend.dto.admin.HouseholdMemberResponse;
import be.househub.backend.dto.household.HouseholdCreateRequest;
import be.househub.backend.dto.household.HouseholdJoinRequest;
import be.househub.backend.dto.household.HouseholdMembershipResponse;
import be.househub.backend.dto.household.HouseholdResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.entity.User;
import be.househub.backend.security.SecurityUtils;
import be.househub.backend.service.HouseholdAccessService;
import be.househub.backend.service.HouseholdService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/households")
@RequiredArgsConstructor
public class HouseholdController {

    private final HouseholdService householdService;
    private final HouseholdAccessService householdAccessService;

    @GetMapping("/mine")
    public List<HouseholdMembershipResponse> mine() {
        return householdService.findMemberships(SecurityUtils.getCurrentUser().getId());
    }

    @GetMapping("/{householdId}")
    public HouseholdResponse get(@PathVariable UUID householdId) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        return householdService.toResponse(household);
    }

    @PostMapping
    public ResponseEntity<HouseholdResponse> create(@Valid @RequestBody HouseholdCreateRequest request) {
        HouseholdResponse created = householdService.createHousehold(SecurityUtils.getCurrentUser(), request.name());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/join")
    public ResponseEntity<HouseholdResponse> join(@Valid @RequestBody HouseholdJoinRequest request) {
        HouseholdResponse joined = householdService.joinHousehold(SecurityUtils.getCurrentUser(), request.inviteCode());
        return ResponseEntity.status(HttpStatus.CREATED).body(joined);
    }

    @PostMapping("/{householdId}/leave")
    public ResponseEntity<Void> leave(@PathVariable UUID householdId) {
        User currentUser = SecurityUtils.getCurrentUser();
        householdAccessService.requireAccess(currentUser, householdId);
        householdService.leaveHousehold(currentUser, householdId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{householdId}/default")
    public List<HouseholdMembershipResponse> setDefault(@PathVariable UUID householdId) {
        User currentUser = SecurityUtils.getCurrentUser();
        householdService.setDefaultHousehold(currentUser, householdId);
        return householdService.findMemberships(currentUser.getId());
    }

    @DeleteMapping("/{householdId}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable UUID householdId, @PathVariable UUID userId) {
        User currentUser = SecurityUtils.getCurrentUser();
        householdAccessService.requireOwner(currentUser, householdId);
        if (userId.equals(currentUser.getId())) {
            throw new IllegalArgumentException("Use the leave endpoint to remove yourself");
        }
        householdService.removeMember(householdId, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{householdId}/members")
    public List<HouseholdMemberResponse> members(@PathVariable UUID householdId) {
        householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        return householdService.findMembers(householdId);
    }
}
