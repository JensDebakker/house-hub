package be.househub.backend.service;

import be.househub.backend.entity.PushSubscription;
import be.househub.backend.repository.PushSubscriptionRepository;
import com.zerodeplibs.webpush.VAPIDKeyPair;
import com.zerodeplibs.webpush.httpclient.StandardHttpClientRequestPreparer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Sends Web Push messages to subscribed browsers/devices, on top of the existing
 * {@link be.househub.backend.websocket.WebSocketBroadcaster WebSocketBroadcaster} (which only
 * reaches a session that's actively connected right now). A push delivery failure must never
 * break whatever triggered it (a chat send, a version deploy) - every failure mode here is
 * caught and logged, never propagated.
 *
 * <p>{@link #sendToSubscriptions} is {@code @Async}: its callers (the chat message handler,
 * the version-deploy listener) run on time-sensitive threads - a WebSocket session's own
 * handling thread, the application startup thread - that must not block on a third-party push
 * service's network latency or a stalled connection for every subscriber, one at a time.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PushNotificationService {

    private static final Duration HTTP_TIMEOUT = Duration.ofSeconds(10);

    private final VAPIDKeyPair vapidKeyPair;
    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(HTTP_TIMEOUT).build();

    @Value("${push.vapid.subject}")
    private String vapidSubject;

    /** Frozen wire shape the frontend's service worker parses out of the push event. */
    public record PushPayload(String title, String body, String url) {
    }

    @Async
    public void sendToSubscriptions(List<PushSubscription> subscriptions, PushPayload payload) {
        if (subscriptions.isEmpty()) {
            return;
        }
        byte[] payloadBytes = serialize(payload);
        if (payloadBytes == null) {
            return;
        }
        for (PushSubscription subscription : subscriptions) {
            sendOne(subscription, payloadBytes);
        }
    }

    private void sendOne(PushSubscription subscription, byte[] payloadBytes) {
        try {
            com.zerodeplibs.webpush.PushSubscription librarySubscription = toLibrarySubscription(subscription);

            HttpRequest request = StandardHttpClientRequestPreparer.getBuilder()
                    .pushSubscription(librarySubscription)
                    .vapidJWTExpiresAfter(12, TimeUnit.HOURS)
                    .vapidJWTSubject(vapidSubject)
                    .pushMessage(payloadBytes)
                    .ttl(1, TimeUnit.DAYS)
                    .urgencyNormal()
                    .build(vapidKeyPair)
                    .toRequestBuilder()
                    .timeout(HTTP_TIMEOUT)
                    .build();

            HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            int status = response.statusCode();

            if (status == 404 || status == 410) {
                // The standard way a push service signals "this subscription is dead" -
                // the browser has unsubscribed or the subscription expired.
                log.debug("Push subscription {} is gone (status {}), removing", subscription.getId(), status);
                pushSubscriptionRepository.deleteById(subscription.getId());
            } else if (status >= 300) {
                log.warn("Push send to subscription {} failed with status {}", subscription.getId(), status);
            }
        } catch (Exception ex) {
            log.warn("Push send to subscription {} threw", subscription.getId(), ex);
        }
    }

    private com.zerodeplibs.webpush.PushSubscription toLibrarySubscription(PushSubscription subscription) {
        var librarySubscription = new com.zerodeplibs.webpush.PushSubscription();
        librarySubscription.setEndpoint(subscription.getEndpoint());

        var keys = new com.zerodeplibs.webpush.PushSubscription.Keys();
        keys.setP256dh(subscription.getP256dh());
        keys.setAuth(subscription.getAuth());
        librarySubscription.setKeys(keys);

        return librarySubscription;
    }

    private byte[] serialize(PushPayload payload) {
        try {
            return objectMapper.writeValueAsBytes(payload);
        } catch (Exception ex) {
            log.warn("Failed to serialize push payload", ex);
            return null;
        }
    }
}
