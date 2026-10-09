package be.househub.backend.service;

import be.househub.backend.dto.shopping.ShoppingListItemRequest;
import be.househub.backend.dto.shopping.ShoppingListRequest;
import be.househub.backend.dto.shopping.ShoppingListResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.entity.ShoppingList;
import be.househub.backend.entity.ShoppingListItem;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.ShoppingListRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
class ShoppingListServiceTest {

    @Mock
    private ShoppingListRepository shoppingListRepository;

    private ShoppingListService shoppingListService;

    @BeforeEach
    void setUp() {
        shoppingListService = new ShoppingListService(shoppingListRepository);
    }

    private Household household() {
        Household household = new Household();
        household.setId(UUID.randomUUID());
        return household;
    }

    private ShoppingList shoppingList(Household household) {
        ShoppingList list = new ShoppingList();
        list.setId(UUID.randomUUID());
        list.setName("Groceries");
        list.setHousehold(household);
        return list;
    }

    private ShoppingListItem item(ShoppingList list) {
        ShoppingListItem item = new ShoppingListItem();
        item.setId(UUID.randomUUID());
        item.setLabel("Milk");
        item.setChecked(false);
        item.setShoppingList(list);
        return item;
    }

    @Test
    void findAll_returnsListsForHousehold() {
        Household household = household();
        ShoppingList list = shoppingList(household);
        when(shoppingListRepository.findByHouseholdId(household.getId())).thenReturn(List.of(list));

        List<ShoppingListResponse> result = shoppingListService.findAll(household);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(list.getId());
        assertThat(result.get(0).name()).isEqualTo(list.getName());
    }

    @Test
    void create_savesListLinkedToHousehold() {
        Household household = household();
        when(shoppingListRepository.save(any(ShoppingList.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ShoppingListResponse response = shoppingListService.create(household, new ShoppingListRequest("Weekly groceries"));

        ArgumentCaptor<ShoppingList> captor = ArgumentCaptor.forClass(ShoppingList.class);
        verify(shoppingListRepository).save(captor.capture());
        assertThat(captor.getValue().getHousehold()).isEqualTo(household);
        assertThat(response.name()).isEqualTo("Weekly groceries");
    }

    @Test
    void rename_existingList_updatesName() {
        Household household = household();
        ShoppingList list = shoppingList(household);
        when(shoppingListRepository.findByIdAndHouseholdId(list.getId(), household.getId())).thenReturn(Optional.of(list));
        when(shoppingListRepository.save(any(ShoppingList.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ShoppingListResponse response = shoppingListService.rename(household, list.getId(), new ShoppingListRequest("Renamed"));

        assertThat(response.name()).isEqualTo("Renamed");
    }

    @Test
    void rename_listNotInHousehold_throwsNotFound() {
        Household household = household();
        UUID listId = UUID.randomUUID();
        when(shoppingListRepository.findByIdAndHouseholdId(listId, household.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> shoppingListService.rename(household, listId, new ShoppingListRequest("Renamed")))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(shoppingListRepository, never()).save(any());
    }

    @Test
    void delete_existingList_removesIt() {
        Household household = household();
        ShoppingList list = shoppingList(household);
        when(shoppingListRepository.findByIdAndHouseholdId(list.getId(), household.getId())).thenReturn(Optional.of(list));

        shoppingListService.delete(household, list.getId());

        verify(shoppingListRepository).delete(list);
    }

    @Test
    void delete_listNotInHousehold_throwsNotFound() {
        Household household = household();
        UUID listId = UUID.randomUUID();
        when(shoppingListRepository.findByIdAndHouseholdId(listId, household.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> shoppingListService.delete(household, listId))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(shoppingListRepository, never()).delete(any());
    }

    @Test
    void addItem_appendsItemToListAndSaves() {
        Household household = household();
        ShoppingList list = shoppingList(household);
        when(shoppingListRepository.findByIdAndHouseholdId(list.getId(), household.getId())).thenReturn(Optional.of(list));
        when(shoppingListRepository.save(any(ShoppingList.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ShoppingListResponse response = shoppingListService.addItem(household, list.getId(), new ShoppingListItemRequest("Eggs", false));

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).label()).isEqualTo("Eggs");
    }

    @Test
    void addItem_listNotInHousehold_throwsNotFound() {
        Household household = household();
        UUID listId = UUID.randomUUID();
        when(shoppingListRepository.findByIdAndHouseholdId(listId, household.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> shoppingListService.addItem(household, listId, new ShoppingListItemRequest("Eggs", false)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updateItem_existingItem_updatesLabelAndChecked() {
        Household household = household();
        ShoppingList list = shoppingList(household);
        ShoppingListItem item = item(list);
        list.getItems().add(item);
        when(shoppingListRepository.findByIdAndHouseholdId(list.getId(), household.getId())).thenReturn(Optional.of(list));
        when(shoppingListRepository.save(any(ShoppingList.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ShoppingListResponse response = shoppingListService.updateItem(household, list.getId(), item.getId(),
                new ShoppingListItemRequest("Oat milk", true));

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).label()).isEqualTo("Oat milk");
        assertThat(response.items().get(0).checked()).isTrue();
    }

    @Test
    void updateItem_unknownItem_throwsNotFound() {
        Household household = household();
        ShoppingList list = shoppingList(household);
        UUID unknownItemId = UUID.randomUUID();
        when(shoppingListRepository.findByIdAndHouseholdId(list.getId(), household.getId())).thenReturn(Optional.of(list));

        assertThatThrownBy(() -> shoppingListService.updateItem(household, list.getId(), unknownItemId,
                new ShoppingListItemRequest("Oat milk", true)))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(shoppingListRepository, never()).save(any());
    }

    @Test
    void removeItem_existingItem_removesItFromList() {
        Household household = household();
        ShoppingList list = shoppingList(household);
        ShoppingListItem item = item(list);
        list.getItems().add(item);
        when(shoppingListRepository.findByIdAndHouseholdId(list.getId(), household.getId())).thenReturn(Optional.of(list));
        when(shoppingListRepository.save(any(ShoppingList.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ShoppingListResponse response = shoppingListService.removeItem(household, list.getId(), item.getId());

        assertThat(response.items()).isEmpty();
    }

    @Test
    void removeItem_unknownItem_throwsNotFound() {
        Household household = household();
        ShoppingList list = shoppingList(household);
        UUID unknownItemId = UUID.randomUUID();
        when(shoppingListRepository.findByIdAndHouseholdId(list.getId(), household.getId())).thenReturn(Optional.of(list));

        assertThatThrownBy(() -> shoppingListService.removeItem(household, list.getId(), unknownItemId))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(shoppingListRepository, never()).save(any());
    }
}
