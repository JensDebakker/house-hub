package be.househub.backend.service;

import be.househub.backend.dto.supply.SupplyRequest;
import be.househub.backend.dto.supply.SupplyResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.entity.Supply;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.SupplyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SupplyService {

    private final SupplyRepository supplyRepository;

    public List<SupplyResponse> findAll(Household household) {
        return supplyRepository.findByHouseholdId(household.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SupplyResponse create(Household household, SupplyRequest request) {
        Supply supply = new Supply();
        supply.setHousehold(household);
        apply(supply, request);
        return toResponse(supplyRepository.save(supply));
    }

    @Transactional
    public SupplyResponse update(Household household, UUID supplyId, SupplyRequest request) {
        Supply supply = findOwned(household, supplyId);
        apply(supply, request);
        return toResponse(supplyRepository.save(supply));
    }

    @Transactional
    public void delete(Household household, UUID supplyId) {
        supplyRepository.delete(findOwned(household, supplyId));
    }

    private Supply findOwned(Household household, UUID supplyId) {
        return supplyRepository.findByIdAndHouseholdId(supplyId, household.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Supply", supplyId));
    }

    private void apply(Supply supply, SupplyRequest request) {
        supply.setName(request.name());
        supply.setQuantity(request.quantity());
        supply.setExpiryDate(request.expiryDate());
    }

    private SupplyResponse toResponse(Supply supply) {
        return new SupplyResponse(supply.getId(), supply.getName(), supply.getQuantity(), supply.getExpiryDate());
    }
}
