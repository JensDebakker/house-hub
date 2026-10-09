package be.househub.backend.service;

import be.househub.backend.dto.supply.SupplyRequest;
import be.househub.backend.dto.supply.SupplyResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.entity.Supply;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.SupplyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SupplyServiceTest {

    @Mock
    private SupplyRepository supplyRepository;

    private SupplyService supplyService;

    @BeforeEach
    void setUp() {
        supplyService = new SupplyService(supplyRepository);
    }

    private Household household() {
        Household household = new Household();
        household.setId(UUID.randomUUID());
        return household;
    }

    private Supply supply(Household household) {
        Supply supply = new Supply();
        supply.setId(UUID.randomUUID());
        supply.setName("Flour");
        supply.setQuantity(2);
        supply.setExpiryDate(LocalDate.now().plusDays(10));
        supply.setHousehold(household);
        return supply;
    }

    private SupplyRequest request() {
        return new SupplyRequest("Sugar", 5, LocalDate.now().plusDays(30));
    }

    @Test
    void findAll_returnsSuppliesForHousehold() {
        Household household = household();
        Supply supply = supply(household);
        when(supplyRepository.findByHouseholdId(household.getId())).thenReturn(List.of(supply));

        List<SupplyResponse> result = supplyService.findAll(household);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(supply.getId());
        assertThat(result.get(0).name()).isEqualTo(supply.getName());
    }

    @Test
    void create_savesSupplyLinkedToHousehold() {
        Household household = household();
        when(supplyRepository.save(any(Supply.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SupplyResponse response = supplyService.create(household, request());

        ArgumentCaptor<Supply> captor = ArgumentCaptor.forClass(Supply.class);
        verify(supplyRepository).save(captor.capture());
        assertThat(captor.getValue().getHousehold()).isEqualTo(household);
        assertThat(captor.getValue().getName()).isEqualTo("Sugar");
        assertThat(captor.getValue().getQuantity()).isEqualTo(5);
        assertThat(response.name()).isEqualTo("Sugar");
    }

    @Test
    void update_existingSupply_appliesRequestFields() {
        Household household = household();
        Supply existing = supply(household);
        when(supplyRepository.findByIdAndHouseholdId(existing.getId(), household.getId()))
                .thenReturn(Optional.of(existing));
        when(supplyRepository.save(any(Supply.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SupplyResponse response = supplyService.update(household, existing.getId(), request());

        assertThat(response.name()).isEqualTo("Sugar");
        assertThat(response.quantity()).isEqualTo(5);
    }

    @Test
    void update_supplyNotInHousehold_throwsNotFound() {
        Household household = household();
        UUID supplyId = UUID.randomUUID();
        when(supplyRepository.findByIdAndHouseholdId(supplyId, household.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> supplyService.update(household, supplyId, request()))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(supplyRepository, never()).save(any());
    }

    @Test
    void delete_existingSupply_removesIt() {
        Household household = household();
        Supply existing = supply(household);
        when(supplyRepository.findByIdAndHouseholdId(existing.getId(), household.getId()))
                .thenReturn(Optional.of(existing));

        supplyService.delete(household, existing.getId());

        verify(supplyRepository).delete(existing);
    }

    @Test
    void delete_supplyNotInHousehold_throwsNotFound() {
        Household household = household();
        UUID supplyId = UUID.randomUUID();
        when(supplyRepository.findByIdAndHouseholdId(supplyId, household.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> supplyService.delete(household, supplyId))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(supplyRepository, never()).delete(any());
    }
}
