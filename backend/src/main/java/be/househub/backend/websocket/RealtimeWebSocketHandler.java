package be.househub.backend.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.util.UUID;

/**
 * Handles the lifecycle of every {@code /ws} connection and relays client-sent messages.
 *
 * <p>Only the "chat" channel accepts client-sent messages today: the sender's
 * {@code houseId} (resolved at handshake time, never trusted from the message body) must
 * match the envelope's {@code houseId}, and the payload is relayed as-is to every other
 * open session in that same household. No persistence, no REST history endpoint — this
 * only proves the transport works end-to-end for a future chat feature. Other channels
 * (e.g. "version") are server-to-client only and any client-sent message on them is
 * ignored.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RealtimeWebSocketHandler extends TextWebSocketHandler {

    private final SessionRegistry sessionRegistry;
    private final WebSocketBroadcaster broadcaster;
    private final ObjectMapper objectMapper;

    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) {
        UUID userId = (UUID) session.getAttributes().get(JwtHandshakeInterceptor.ATTR_USER_ID);
        UUID houseId = (UUID) session.getAttributes().get(JwtHandshakeInterceptor.ATTR_HOUSE_ID);
        sessionRegistry.register(session, userId, houseId);
        log.debug("Websocket session {} established for user {} (house {})", session.getId(), userId, houseId);
    }

    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus status) {
        sessionRegistry.unregister(session);
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

        broadcaster.broadcastToHouse(sessionHouseId, envelope, session.getId());
    }
}
