package be.househub.backend.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.UUID;

/**
 * Serializes a {@link MessageEnvelope} and fans it out to sessions tracked by the
 * {@link SessionRegistry}. Shared by server-initiated pushes (version) and
 * client-triggered relays (chat).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketBroadcaster {

    private final SessionRegistry sessionRegistry;
    private final ObjectMapper objectMapper;

    /** Sends the envelope to every currently-open session, regardless of house. */
    public void broadcastToAll(MessageEnvelope envelope) {
        String json = serialize(envelope);
        if (json == null) {
            return;
        }
        for (SessionRegistry.SessionInfo info : sessionRegistry.all()) {
            send(info.session(), json);
        }
    }

    /**
     * Sends the envelope to every open session registered against {@code houseId},
     * excluding the session identified by {@code excludeSessionId} (typically the sender).
     */
    public void broadcastToHouse(UUID houseId, MessageEnvelope envelope, String excludeSessionId) {
        String json = serialize(envelope);
        if (json == null) {
            return;
        }
        for (SessionRegistry.SessionInfo info : sessionRegistry.inHouse(houseId)) {
            if (!info.session().getId().equals(excludeSessionId)) {
                send(info.session(), json);
            }
        }
    }

    /**
     * Sends the envelope to every open session registered against {@code houseId}, with no
     * exclusion. Used when the broadcast originates from a REST call rather than a connected
     * websocket session, so there is no sender session to exclude.
     */
    public void broadcastToHouse(UUID houseId, MessageEnvelope envelope) {
        String json = serialize(envelope);
        if (json == null) {
            return;
        }
        for (SessionRegistry.SessionInfo info : sessionRegistry.inHouse(houseId)) {
            send(info.session(), json);
        }
    }

    private String serialize(MessageEnvelope envelope) {
        try {
            return objectMapper.writeValueAsString(envelope);
        } catch (JacksonException ex) {
            log.warn("Failed to serialize websocket envelope for channel {}", envelope.channel(), ex);
            return null;
        }
    }

    private void send(WebSocketSession session, String json) {
        if (!session.isOpen()) {
            return;
        }
        try {
            session.sendMessage(new TextMessage(json));
        } catch (IOException ex) {
            log.debug("Failed to send websocket message to session {}", session.getId(), ex);
        }
    }
}
