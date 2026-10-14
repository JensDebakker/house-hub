package be.househub.backend.service;

import be.househub.backend.dto.push.PushPreferencesUpdateRequest;
import be.househub.backend.dto.push.PushSubscriptionRequest;
import be.househub.backend.dto.push.PushSubscriptionResponse;
import be.househub.backend.entity.PushSubscription;
import be.househub.backend.entity.User;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.PushSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PushSubscriptionService {

    private final PushSubscriptionRepository pushSubscriptionRepository;

    /** Upsert by endpoint alone (not scoped to the current user) - the DB enforces endpoint
     * uniqueness globally, since a push endpoint URL belongs to exactly one browser
     * subscription regardless of which account is logged in when it's created. Looking this
     * up scoped to (user, endpoint) instead would miss a row that already exists under a
     * different user (e.g. someone logged out and another user logged in on the same device
     * without the service worker unsubscribing first) and then fail on the unique
     * constraint - reassigning ownership here instead is what makes this a true upsert. */
    @Transactional
    public PushSubscriptionResponse subscribe(User user, PushSubscriptionRequest request) {
        PushSubscription subscription = pushSubscriptionRepository
                .findByEndpoint(request.endpoint())
                .orElseGet(PushSubscription::new);

        subscription.setUser(user);
        subscription.setEndpoint(request.endpoint());
        subscription.setP256dh(request.keys().p256dh());
        subscription.setAuth(request.keys().auth());
        subscription.setNotifyOnVersion(request.notifyOnVersion());
        subscription.setNotifyOnChatMessage(request.notifyOnChatMessage());

        return toResponse(pushSubscriptionRepository.save(subscription));
    }

    @Transactional
    public PushSubscriptionResponse updatePreferences(User user, PushPreferencesUpdateRequest request) {
        PushSubscription subscription = requireOwned(user, request.endpoint());

        if (request.notifyOnVersion() != null) {
            subscription.setNotifyOnVersion(request.notifyOnVersion());
        }
        if (request.notifyOnChatMessage() != null) {
            subscription.setNotifyOnChatMessage(request.notifyOnChatMessage());
        }

        return toResponse(subscription);
    }

    @Transactional
    public void unsubscribe(User user, String endpoint) {
        requireOwned(user, endpoint);
        pushSubscriptionRepository.deleteByUserIdAndEndpoint(user.getId(), endpoint);
    }

    /** 404, not 403: a subscription endpoint belonging to someone else should look
     * indistinguishable from one that doesn't exist at all. */
    private PushSubscription requireOwned(User user, String endpoint) {
        return pushSubscriptionRepository.findByUserIdAndEndpoint(user.getId(), endpoint)
                .orElseThrow(() -> new ResourceNotFoundException("PushSubscription", endpoint));
    }

    private PushSubscriptionResponse toResponse(PushSubscription subscription) {
        return new PushSubscriptionResponse(
                subscription.getId(),
                subscription.getEndpoint(),
                subscription.isNotifyOnVersion(),
                subscription.isNotifyOnChatMessage()
        );
    }
}
