package be.househub.backend.service;

import be.househub.backend.dto.shopping.ShoppingListItemRequest;
import be.househub.backend.dto.shopping.ShoppingListItemResponse;
import be.househub.backend.dto.shopping.ShoppingListRequest;
import be.househub.backend.dto.shopping.ShoppingListResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.entity.ShoppingList;
import be.househub.backend.entity.ShoppingListItem;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.ShoppingListRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ShoppingListService {

    private final ShoppingListRepository shoppingListRepository;

    public List<ShoppingListResponse> findAll(Household household) {
        return shoppingListRepository.findByHouseholdId(household.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ShoppingListResponse create(Household household, ShoppingListRequest request) {
        ShoppingList list = new ShoppingList();
        list.setHousehold(household);
        list.setName(request.name());
        return toResponse(shoppingListRepository.save(list));
    }

    @Transactional
    public ShoppingListResponse rename(Household household, UUID listId, ShoppingListRequest request) {
        ShoppingList list = findOwned(household, listId);
        list.setName(request.name());
        return toResponse(shoppingListRepository.save(list));
    }

    @Transactional
    public void delete(Household household, UUID listId) {
        shoppingListRepository.delete(findOwned(household, listId));
    }

    @Transactional
    public ShoppingListResponse addItem(Household household, UUID listId, ShoppingListItemRequest request) {
        ShoppingList list = findOwned(household, listId);
        ShoppingListItem item = new ShoppingListItem();
        item.setShoppingList(list);
        item.setLabel(request.label());
        item.setChecked(request.checked());
        list.getItems().add(item);
        return toResponse(shoppingListRepository.save(list));
    }

    @Transactional
    public ShoppingListResponse updateItem(Household household, UUID listId, UUID itemId, ShoppingListItemRequest request) {
        ShoppingList list = findOwned(household, listId);
        ShoppingListItem item = list.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("ShoppingListItem", itemId));
        item.setLabel(request.label());
        item.setChecked(request.checked());
        return toResponse(shoppingListRepository.save(list));
    }

    @Transactional
    public ShoppingListResponse removeItem(Household household, UUID listId, UUID itemId) {
        ShoppingList list = findOwned(household, listId);
        boolean removed = list.getItems().removeIf(i -> i.getId().equals(itemId));
        if (!removed) {
            throw new ResourceNotFoundException("ShoppingListItem", itemId);
        }
        return toResponse(shoppingListRepository.save(list));
    }

    private ShoppingList findOwned(Household household, UUID listId) {
        return shoppingListRepository.findByIdAndHouseholdId(listId, household.getId())
                .orElseThrow(() -> new ResourceNotFoundException("ShoppingList", listId));
    }

    private ShoppingListResponse toResponse(ShoppingList list) {
        List<ShoppingListItemResponse> items = list.getItems().stream()
                .map(i -> new ShoppingListItemResponse(i.getId(), i.getLabel(), i.isChecked()))
                .toList();
        return new ShoppingListResponse(list.getId(), list.getName(), items);
    }
}
