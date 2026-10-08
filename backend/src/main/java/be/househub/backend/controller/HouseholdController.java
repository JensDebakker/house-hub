package be.househub.backend.controller;

import be.househub.backend.dto.household.HouseholdMembershipResponse;
import be.househub.backend.dto.household.HouseholdResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.security.SecurityUtils;
import be.househub.backend.service.HouseholdAccessService;
import be.househub.backend.service.HouseholdService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
}
