package be.househub.backend.service;

import be.househub.backend.dto.household.HouseholdMembershipResponse;
import be.househub.backend.dto.household.HouseholdResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.repository.CalendarEventRepository;
import be.househub.backend.repository.HouseFileRepository;
import be.househub.backend.repository.HouseholdMembershipRepository;
import be.househub.backend.repository.ShoppingListRepository;
import be.househub.backend.repository.SupplyRepository;
import be.househub.backend.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HouseholdService {

    private final HouseholdMembershipRepository membershipRepository;
    private final TaskRepository taskRepository;
    private final SupplyRepository supplyRepository;
    private final ShoppingListRepository shoppingListRepository;
    private final CalendarEventRepository calendarEventRepository;
    private final HouseFileRepository houseFileRepository;

    public List<HouseholdMembershipResponse> findMemberships(UUID userId) {
        return membershipRepository.findByUserId(userId).stream()
                .map(m -> new HouseholdMembershipResponse(m.getHousehold().getId(), m.getHousehold().getName(), m.getRole()))
                .toList();
    }

    public HouseholdResponse toResponse(Household household) {
        UUID id = household.getId();
        return new HouseholdResponse(
                id,
                household.getName(),
                household.getInviteCode(),
                membershipRepository.countByHouseholdId(id),
                taskRepository.countByHouseholdId(id),
                supplyRepository.countByHouseholdId(id),
                shoppingListRepository.countByHouseholdId(id),
                calendarEventRepository.countByHouseholdId(id),
                houseFileRepository.countByHouseholdId(id),
                houseFileRepository.sumSizeBytesByHouseholdId(id),
                household.getStorageLimitBytes(),
                household.getCreatedAt()
        );
    }
}
