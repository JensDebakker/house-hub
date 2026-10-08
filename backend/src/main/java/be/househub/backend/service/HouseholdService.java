package be.househub.backend.service;

import be.househub.backend.dto.household.HouseholdResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HouseholdService {

    private final UserRepository userRepository;

    public HouseholdResponse getCurrent(Household household) {
        long memberCount = userRepository.countByHouseholdId(household.getId());
        return new HouseholdResponse(household.getId(), household.getName(), memberCount);
    }
}
