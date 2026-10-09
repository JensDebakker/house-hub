package be.househub.backend.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tracks every currently-open {@code /ws} session, tagged with the authenticated user
 * (and, if the connection was opened for a specific household, that household's id).
 * Backed by a thread-safe map since sessions are registered/removed from whichever
 * thread the WebSocket container happens to use per connection.
 */
@Component
public class SessionRegistry {

    public record SessionInfo(WebSocketSession session, UUID userId, UUID houseId) {
    }

    private final Map<String, SessionInfo> sessionsBySessionId = new ConcurrentHashMap<>();

    public void register(WebSocketSession session, UUID userId, UUID houseId) {
        sessionsBySessionId.put(session.getId(), new SessionInfo(session, userId, houseId));
    }

    public void unregister(WebSocketSession session) {
        sessionsBySessionId.remove(session.getId());
    }

    public Collection<SessionInfo> all() {
        return List.copyOf(sessionsBySessionId.values());
    }

    public List<SessionInfo> inHouse(UUID houseId) {
        return sessionsBySessionId.values().stream()
                .filter(info -> houseId.equals(info.houseId()))
                .toList();
    }
}
