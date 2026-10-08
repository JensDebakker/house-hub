package be.househub.backend.controller;

import be.househub.backend.dto.shopping.ShoppingListItemRequest;
import be.househub.backend.dto.shopping.ShoppingListRequest;
import be.househub.backend.dto.shopping.ShoppingListResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.security.SecurityUtils;
import be.househub.backend.service.HouseholdAccessService;
import be.househub.backend.service.ShoppingListService;
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
@RequestMapping("/households/{householdId}/shopping-lists")
@RequiredArgsConstructor
public class ShoppingListController {

    private final ShoppingListService shoppingListService;
    private final HouseholdAccessService householdAccessService;

    @GetMapping
    public List<ShoppingListResponse> findAll(@PathVariable UUID householdId) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        return shoppingListService.findAll(household);
    }

    @PostMapping
    public ResponseEntity<ShoppingListResponse> create(@PathVariable UUID householdId, @Valid @RequestBody ShoppingListRequest request) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        var created = shoppingListService.create(household, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{listId}")
    public ShoppingListResponse rename(@PathVariable UUID householdId, @PathVariable UUID listId,
                                        @Valid @RequestBody ShoppingListRequest request) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        return shoppingListService.rename(household, listId, request);
    }

    @DeleteMapping("/{listId}")
    public ResponseEntity<Void> delete(@PathVariable UUID householdId, @PathVariable UUID listId) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        shoppingListService.delete(household, listId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{listId}/items")
    public ShoppingListResponse addItem(@PathVariable UUID householdId, @PathVariable UUID listId,
                                         @Valid @RequestBody ShoppingListItemRequest request) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        return shoppingListService.addItem(household, listId, request);
    }

    @PutMapping("/{listId}/items/{itemId}")
    public ShoppingListResponse updateItem(@PathVariable UUID householdId, @PathVariable UUID listId, @PathVariable UUID itemId,
                                            @Valid @RequestBody ShoppingListItemRequest request) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        return shoppingListService.updateItem(household, listId, itemId, request);
    }

    @DeleteMapping("/{listId}/items/{itemId}")
    public ShoppingListResponse removeItem(@PathVariable UUID householdId, @PathVariable UUID listId, @PathVariable UUID itemId) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        return shoppingListService.removeItem(household, listId, itemId);
    }
}
