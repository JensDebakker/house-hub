package be.househub.backend.controller;

import be.househub.backend.dto.household.HouseholdResponse;
import be.househub.backend.security.SecurityUtils;
import be.househub.backend.service.HouseholdService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/households")
@RequiredArgsConstructor
public class HouseholdController {

    private final HouseholdService householdService;

    @GetMapping("/me")
    public HouseholdResponse me() {
        return householdService.getCurrent(SecurityUtils.getCurrentUser().getHousehold());
    }
}
