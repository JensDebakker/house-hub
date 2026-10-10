package be.househub.backend.websocket;

import be.househub.backend.dto.chat.ChatMessageResponse;
import be.househub.backend.service.ChatMessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.UUID;

/**
 * Handles the lifecycle of every {@code /ws} connection and relays client-sent messages.
 *
 * <p>Only the "chat" channel accepts client-sent messages today: the sender's
 * {@code houseId} (resolved at handshake time, never trusted from the message body) must
 * match the envelope's {@code houseId}. The message is persisted via
 * {@link ChatMessageService} and the persisted (server-assigned id/timestamp/sender
 * display name) form is relayed to every other open session in that same household —
 * never echoed back to the sender. Other channels (e.g. "version") are server-to-client
 * only and any client-sent message on them is ignored.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RealtimeWebSocketHandler extends TextWebSocketHandler {

    private final SessionRegistry sessionRegistry;
    private final WebSocketBroadcaster broadcaster;
    private final ObjectMapper objectMapper;
    private final ChatMessageService chatMessageService;

    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) {
        UUID userId = (UUID) session.getAttributes().get(JwtHandshakeInterceptor.ATTR_USER_ID);
        UUID houseId = (UUID) session.getAttributes().get(JwtHandshakeInterceptor.ATTR_HOUSE_ID);
        sessionRegistry.register(session, userId, houseId);
        log.debug("Websocket session {} established for user {} (house {})", session.getId(), userId, houseId);
        broadcastPresenceIfHouse(houseId);
    }

    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus status) {
        UUID houseId = (UUID) session.getAttributes().get(JwtHandshakeInterceptor.ATTR_HOUSE_ID);
        sessionRegistry.unregister(session);
        broadcastPresenceIfHouse(houseId);
    }

    /** Broadcasts the current distinct-user count for {@code houseId}, if non-null. */
    private void broadcastPresenceIfHouse(UUID houseId) {
        if (houseId == null) {
            return;
        }
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("count", sessionRegistry.distinctUserCount(houseId));

        MessageEnvelope envelope = MessageEnvelope.of(MessageEnvelope.CHANNEL_PRESENCE, houseId, payload);
        broadcaster.broadcastToHouse(houseId, envelope, null);
    }

    @Override
    protected void handleTextMessage(@NonNull WebSocketSession session, @NonNull TextMessage message) {
        MessageEnvelope envelope;
        try {
            envelope = objectMapper.readValue(message.getPayload(), MessageEnvelope.class);
        } catch (JacksonException ex) {
            log.debug("Ignoring malformed websocket message on session {}", session.getId());
            return;
        }

        if (!MessageEnvelope.CHANNEL_CHAT.equals(envelope.channel())) {
            // "version" (and any other server-origin channel) is push-only; nothing else
            // accepts client-sent messages yet.
            return;
        }

        UUID sessionHouseId = (UUID) session.getAttributes().get(JwtHandshakeInterceptor.ATTR_HOUSE_ID);
        if (sessionHouseId == null || !sessionHouseId.equals(envelope.houseId())) {
            log.warn("Rejecting chat message from session {}: house mismatch (session house {}, message house {})",
                    session.getId(), sessionHouseId, envelope.houseId());
            return;
        }

        UUID userId = (UUID) session.getAttributes().get(JwtHandshakeInterceptor.ATTR_USER_ID);
        JsonNode payload = envelope.payload();
        String text = payload == null ? null : payload.path("text").asString(null);
        if (text == null) {
            log.debug("Ignoring chat message from session {}: missing text payload", session.getId());
            return;
        }

        ChatMessageResponse persisted;
        try {
            persisted = chatMessageService.persist(sessionHouseId, userId, text);
        } catch (IllegalArgumentException ex) {
            log.debug("Dropping chat message from session {}: {}", session.getId(), ex.getMessage());
            return;
        }

        MessageEnvelope outgoing = MessageEnvelope.of(
                MessageEnvelope.CHANNEL_CHAT, sessionHouseId, objectMapper.valueToTree(persisted));
        broadcaster.broadcastToHouse(sessionHouseId, outgoing, session.getId());
    }
}
