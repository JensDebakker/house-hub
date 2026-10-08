package be.househub.backend.controller;

import be.househub.backend.dto.supply.SupplyRequest;
import be.househub.backend.dto.supply.SupplyResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.security.SecurityUtils;
import be.househub.backend.service.HouseholdAccessService;
import be.househub.backend.service.SupplyService;
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
@RequestMapping("/households/{householdId}/supplies")
@RequiredArgsConstructor
public class SupplyController {

    private final SupplyService supplyService;
    private final HouseholdAccessService householdAccessService;

    @GetMapping
    public List<SupplyResponse> findAll(@PathVariable UUID householdId) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        return supplyService.findAll(household);
    }

    @PostMapping
    public ResponseEntity<SupplyResponse> create(@PathVariable UUID householdId, @Valid @RequestBody SupplyRequest request) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        var created = supplyService.create(household, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public SupplyResponse update(@PathVariable UUID householdId, @PathVariable UUID id, @Valid @RequestBody SupplyRequest request) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        return supplyService.update(household, id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID householdId, @PathVariable UUID id) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        supplyService.delete(household, id);
        return ResponseEntity.noContent().build();
    }
}
