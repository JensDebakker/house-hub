package be.househub.backend.websocket;

import be.househub.backend.repository.PushSubscriptionRepository;
import be.househub.backend.service.PushNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * Pushes the running backend's version to every currently-open {@code /ws} session once,
 * right after startup. A fresh deploy restarts the process, so this fires exactly once
 * per deploy — which is what drives the frontend's auto-refresh-on-new-version behaviour.
 *
 * <p>Also sends a Web Push to every subscription opted into version-update notifications,
 * since a WebSocket broadcast only reaches a session that's open right now.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class VersionBroadcastListener {

    private final WebSocketBroadcaster broadcaster;
    private final ObjectMapper objectMapper;
    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final PushNotificationService pushNotificationService;

    @Value("${app.version}")
    private String version;

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("value", "v" + version);

        MessageEnvelope envelope = MessageEnvelope.of(MessageEnvelope.CHANNEL_VERSION, null, payload);
        log.info("Broadcasting backend version v{} to open websocket sessions", version);
        broadcaster.broadcastToAll(envelope);

        var subscriptions = pushSubscriptionRepository.findByNotifyOnVersionTrue();
        pushNotificationService.sendToSubscriptions(subscriptions, new PushNotificationService.PushPayload(
                "House Hub updated",
                "Now running v" + version + ".",
                "/app"));
    }
}
