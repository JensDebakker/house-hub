package be.househub.backend.controller;

import be.househub.backend.dto.shopping.ShoppingListItemRequest;
import be.househub.backend.dto.shopping.ShoppingListRequest;
import be.househub.backend.dto.shopping.ShoppingListResponse;
import be.househub.backend.security.SecurityUtils;
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
@RequestMapping("/shopping-lists")
@RequiredArgsConstructor
public class ShoppingListController {

    private final ShoppingListService shoppingListService;

    @GetMapping
    public List<ShoppingListResponse> findAll() {
        return shoppingListService.findAll(SecurityUtils.getCurrentUser().getHousehold());
    }

    @PostMapping
    public ResponseEntity<ShoppingListResponse> create(@Valid @RequestBody ShoppingListRequest request) {
        var created = shoppingListService.create(SecurityUtils.getCurrentUser().getHousehold(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{listId}")
    public ShoppingListResponse rename(@PathVariable UUID listId, @Valid @RequestBody ShoppingListRequest request) {
        return shoppingListService.rename(SecurityUtils.getCurrentUser().getHousehold(), listId, request);
    }

    @DeleteMapping("/{listId}")
    public ResponseEntity<Void> delete(@PathVariable UUID listId) {
        shoppingListService.delete(SecurityUtils.getCurrentUser().getHousehold(), listId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{listId}/items")
    public ShoppingListResponse addItem(@PathVariable UUID listId, @Valid @RequestBody ShoppingListItemRequest request) {
        return shoppingListService.addItem(SecurityUtils.getCurrentUser().getHousehold(), listId, request);
    }

    @PutMapping("/{listId}/items/{itemId}")
    public ShoppingListResponse updateItem(@PathVariable UUID listId, @PathVariable UUID itemId,
                                            @Valid @RequestBody ShoppingListItemRequest request) {
        return shoppingListService.updateItem(SecurityUtils.getCurrentUser().getHousehold(), listId, itemId, request);
    }

    @DeleteMapping("/{listId}/items/{itemId}")
    public ShoppingListResponse removeItem(@PathVariable UUID listId, @PathVariable UUID itemId) {
        return shoppingListService.removeItem(SecurityUtils.getCurrentUser().getHousehold(), listId, itemId);
    }
}
