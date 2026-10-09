package be.househub.backend.websocket;

import be.househub.backend.dto.chat.ChatMessageResponse;
import be.househub.backend.service.ChatMessageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Exercises the handler end-to-end against real {@link SessionRegistry} /
 * {@link WebSocketBroadcaster} instances (only the {@link WebSocketSession}s themselves
 * are mocked) rather than mocking collaborators, so it also proves the version broadcast
 * from {@link VersionBroadcastListener} actually reaches a connected session.
 */
@ExtendWith(MockitoExtension.class)
class RealtimeWebSocketHandlerTest {

    @Mock
    private WebSocketSession sessionA1; // house A
    @Mock
    private WebSocketSession sessionA2; // house A
    @Mock
    private WebSocketSession sessionB1; // house B

    @Mock
    private ChatMessageService chatMessageService;

    private SessionRegistry sessionRegistry;
    private RealtimeWebSocketHandler handler;
    private VersionBroadcastListener versionBroadcastListener;
    private ObjectMapper objectMapper;

    private final UUID houseA = UUID.randomUUID();
    private final UUID houseB = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        sessionRegistry = new SessionRegistry();
        WebSocketBroadcaster broadcaster = new WebSocketBroadcaster(sessionRegistry, objectMapper);
        handler = new RealtimeWebSocketHandler(sessionRegistry, broadcaster, objectMapper, chatMessageService);
        versionBroadcastListener = new VersionBroadcastListener(broadcaster, objectMapper);
        ReflectionTestUtils.setField(versionBroadcastListener, "version", "110");

        mockSession(sessionA1, "session-a1", UUID.randomUUID(), houseA);
        mockSession(sessionA2, "session-a2", UUID.randomUUID(), houseA);
        mockSession(sessionB1, "session-b1", UUID.randomUUID(), houseB);
    }

    private void mockSession(WebSocketSession session, String id, UUID userId, UUID houseId) {
        lenient().when(session.getId()).thenReturn(id);
        lenient().when(session.isOpen()).thenReturn(true);
        Map<String, Object> attributes = new HashMap<>();
        attributes.put(JwtHandshakeInterceptor.ATTR_USER_ID, userId);
        if (houseId != null) {
            attributes.put(JwtHandshakeInterceptor.ATTR_HOUSE_ID, houseId);
        }
        lenient().when(session.getAttributes()).thenReturn(attributes);
    }

    @Test
    void versionBroadcast_reachesEveryConnectedSession() throws Exception {
        handler.afterConnectionEstablished(sessionA1);
        handler.afterConnectionEstablished(sessionB1);

        versionBroadcastListener.onApplicationReady();

        verify(sessionA1).sendMessage(any(TextMessage.class));
        verify(sessionB1).sendMessage(any(TextMessage.class));
    }

    @Test
    void chatMessage_relayedToOtherSessionsInSameHouseOnly() throws Exception {
        UUID messageId = UUID.randomUUID();
        UUID senderId = UUID.randomUUID();
        Instant createdAt = Instant.now();
        when(chatMessageService.persist(eq(houseA), any(UUID.class), eq("hello")))
                .thenReturn(new ChatMessageResponse(messageId, houseA, senderId, "Alice", "hello", createdAt));

        handler.afterConnectionEstablished(sessionA1);
        handler.afterConnectionEstablished(sessionA2);
        handler.afterConnectionEstablished(sessionB1);

        String chatJson = """
                {"channel":"chat","houseId":"%s","payload":{"text":"hello"}}
                """.formatted(houseA);

        handler.handleMessage(sessionA1, new TextMessage(chatJson));

        verify(chatMessageService).persist(eq(houseA), any(UUID.class), eq("hello"));
        verify(sessionA2).sendMessage(any(TextMessage.class));
        verify(sessionA1, never()).sendMessage(any(TextMessage.class));
        verify(sessionB1, never()).sendMessage(any(TextMessage.class));
    }

    @Test
    void chatMessage_withMismatchedHouseId_isDropped() throws Exception {
        handler.afterConnectionEstablished(sessionA1);
        handler.afterConnectionEstablished(sessionA2);

        String chatJson = """
                {"channel":"chat","houseId":"%s","payload":{"text":"should be dropped"}}
                """.formatted(houseB);

        handler.handleMessage(sessionA1, new TextMessage(chatJson));

        verify(sessionA2, never()).sendMessage(any(TextMessage.class));
        verify(chatMessageService, never()).persist(any(UUID.class), any(UUID.class), any(String.class));
    }

    @Test
    void connectionClosed_removesSessionFromRegistry() {
        handler.afterConnectionEstablished(sessionA1);
        assertThat(sessionRegistry.all()).hasSize(1);

        handler.afterConnectionClosed(sessionA1, org.springframework.web.socket.CloseStatus.NORMAL);

        assertThat(sessionRegistry.all()).isEmpty();
    }
}
