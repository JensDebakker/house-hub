package be.househub.backend.controller;

import be.househub.backend.dto.push.PushPreferencesUpdateRequest;
import be.househub.backend.dto.push.PushSubscriptionRequest;
import be.househub.backend.dto.push.PushSubscriptionResponse;
import be.househub.backend.security.SecurityUtils;
import be.househub.backend.service.PushSubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/push/subscriptions")
@RequiredArgsConstructor
public class PushSubscriptionController {

    private final PushSubscriptionService pushSubscriptionService;

    @PostMapping
    public ResponseEntity<PushSubscriptionResponse> subscribe(@Valid @RequestBody PushSubscriptionRequest request) {
        var response = pushSubscriptionService.subscribe(SecurityUtils.getCurrentUser(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping
    public PushSubscriptionResponse updatePreferences(@Valid @RequestBody PushPreferencesUpdateRequest request) {
        return pushSubscriptionService.updatePreferences(SecurityUtils.getCurrentUser(), request);
    }

    @DeleteMapping
    public ResponseEntity<Void> unsubscribe(@RequestParam String endpoint) {
        pushSubscriptionService.unsubscribe(SecurityUtils.getCurrentUser(), endpoint);
        return ResponseEntity.noContent().build();
    }
}
