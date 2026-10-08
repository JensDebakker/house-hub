package be.househub.backend.dto.admin;

import be.househub.backend.dto.calendar.CalendarEventResponse;
import be.househub.backend.dto.file.HouseFileResponse;
import be.househub.backend.dto.household.HouseholdResponse;
import be.househub.backend.dto.shopping.ShoppingListResponse;
import be.househub.backend.dto.supply.SupplyResponse;
import be.househub.backend.dto.task.TaskResponse;

import java.util.List;

public record HouseholdDetailResponse(
        HouseholdResponse household,
        List<HouseholdMemberResponse> members,
        List<TaskResponse> tasks,
        List<SupplyResponse> supplies,
        List<ShoppingListResponse> shoppingLists,
        List<CalendarEventResponse> calendarEvents,
        List<HouseFileResponse> files
) {
}
