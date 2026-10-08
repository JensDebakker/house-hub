package be.househub.backend.controller;

import be.househub.backend.dto.supply.SupplyRequest;
import be.househub.backend.dto.supply.SupplyResponse;
import be.househub.backend.security.SecurityUtils;
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
@RequestMapping("/supplies")
@RequiredArgsConstructor
public class SupplyController {

    private final SupplyService supplyService;

    @GetMapping
    public List<SupplyResponse> findAll() {
        return supplyService.findAll(SecurityUtils.getCurrentUser().getHousehold());
    }

    @PostMapping
    public ResponseEntity<SupplyResponse> create(@Valid @RequestBody SupplyRequest request) {
        var created = supplyService.create(SecurityUtils.getCurrentUser().getHousehold(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public SupplyResponse update(@PathVariable UUID id, @Valid @RequestBody SupplyRequest request) {
        return supplyService.update(SecurityUtils.getCurrentUser().getHousehold(), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        supplyService.delete(SecurityUtils.getCurrentUser().getHousehold(), id);
        return ResponseEntity.noContent().build();
    }
}
