package be.househub.backend.websocket;

import be.househub.backend.dto.chat.ChatMessageResponse;
import be.househub.backend.service.ChatMessageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
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
    private final UUID userIdA1 = UUID.randomUUID();
    private final UUID userIdA2 = UUID.randomUUID();
    private final UUID userIdB1 = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        sessionRegistry = new SessionRegistry();
        WebSocketBroadcaster broadcaster = new WebSocketBroadcaster(sessionRegistry, objectMapper);
        handler = new RealtimeWebSocketHandler(sessionRegistry, broadcaster, objectMapper, chatMessageService);
        versionBroadcastListener = new VersionBroadcastListener(broadcaster, objectMapper);
        ReflectionTestUtils.setField(versionBroadcastListener, "version", "110");

        mockSession(sessionA1, "session-a1", userIdA1, houseA);
        mockSession(sessionA2, "session-a2", userIdA2, houseA);
        mockSession(sessionB1, "session-b1", userIdB1, houseB);
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
        clearInvocations(sessionA1, sessionB1); // drop the connect-time presence broadcasts

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
        clearInvocations(sessionA1, sessionA2, sessionB1); // drop the connect-time presence broadcasts

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
        clearInvocations(sessionA1, sessionA2); // drop the connect-time presence broadcasts

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

        handler.afterConnectionClosed(sessionA1, CloseStatus.NORMAL);

        assertThat(sessionRegistry.all()).isEmpty();
    }

    @Test
    void connecting_broadcastsPresenceCountReflectingNewTotalToWholeHouse() throws Exception {
        handler.afterConnectionEstablished(sessionA1);

        MessageEnvelope first = lastEnvelopeSentTo(sessionA1);
        assertThat(first.channel()).isEqualTo(MessageEnvelope.CHANNEL_PRESENCE);
        assertThat(first.houseId()).isEqualTo(houseA);
        assertThat(first.payload().path("count").asInt()).isEqualTo(1);

        handler.afterConnectionEstablished(sessionA2);

        // the second connect's broadcast reaches every session in house A, including A1.
        assertThat(lastEnvelopeSentTo(sessionA1).payload().path("count").asInt()).isEqualTo(2);
        assertThat(lastEnvelopeSentTo(sessionA2).payload().path("count").asInt()).isEqualTo(2);

        // house B is unaffected by house A's presence changes.
        verify(sessionB1, never()).sendMessage(any(TextMessage.class));
    }

    @Test
    void disconnecting_broadcastsPresenceCountReflectingReducedTotal() {
        handler.afterConnectionEstablished(sessionA1);
        handler.afterConnectionEstablished(sessionA2);
        clearInvocations(sessionA1, sessionA2);

        handler.afterConnectionClosed(sessionA2, CloseStatus.NORMAL);

        MessageEnvelope envelope = lastEnvelopeSentTo(sessionA1);
        assertThat(envelope.channel()).isEqualTo(MessageEnvelope.CHANNEL_PRESENCE);
        assertThat(envelope.payload().path("count").asInt()).isEqualTo(1);
    }

    @Test
    void sessionWithNoHouseId_neitherConnectNorDisconnectTriggersPresenceBroadcast() throws Exception {
        WebSocketSession houseless = mock(WebSocketSession.class);
        mockSession(houseless, "session-houseless", UUID.randomUUID(), null);

        handler.afterConnectionEstablished(houseless);
        verify(houseless, never()).sendMessage(any(TextMessage.class));

        handler.afterConnectionClosed(houseless, CloseStatus.NORMAL);
        verify(houseless, never()).sendMessage(any(TextMessage.class));
    }

    @Test
    void sameUserWithTwoSessionsInSameHouse_countsAsOneDistinctUser() {
        WebSocketSession sessionA1SecondDevice = mock(WebSocketSession.class);
        mockSession(sessionA1SecondDevice, "session-a1-second-device", userIdA1, houseA);

        handler.afterConnectionEstablished(sessionA1);
        handler.afterConnectionEstablished(sessionA1SecondDevice);

        MessageEnvelope envelope = lastEnvelopeSentTo(sessionA1SecondDevice);
        assertThat(envelope.payload().path("count").asInt()).isEqualTo(1);
    }

    /** Decodes the most recent {@link TextMessage} sent to {@code session} as a {@link MessageEnvelope}. */
    private MessageEnvelope lastEnvelopeSentTo(WebSocketSession session) {
        try {
            ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
            verify(session, atLeastOnce()).sendMessage(captor.capture());
            List<TextMessage> sent = captor.getAllValues();
            return objectMapper.readValue(sent.get(sent.size() - 1).getPayload(), MessageEnvelope.class);
        } catch (IOException | JacksonException ex) {
            throw new AssertionError("Failed to decode envelope sent to session", ex);
        }
    }
}
