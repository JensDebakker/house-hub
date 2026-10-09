package be.househub.backend.websocket;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class VersionBroadcastListenerTest {

    @Mock
    private WebSocketBroadcaster broadcaster;

    private VersionBroadcastListener listener;

    @BeforeEach
    void setUp() {
        listener = new VersionBroadcastListener(broadcaster, new ObjectMapper());
        ReflectionTestUtils.setField(listener, "version", "110");
    }

    @Test
    void onApplicationReady_broadcastsVersionEnvelopeToAllSessions() {
        listener.onApplicationReady();

        ArgumentCaptor<MessageEnvelope> captor = ArgumentCaptor.forClass(MessageEnvelope.class);
        verify(broadcaster).broadcastToAll(captor.capture());

        MessageEnvelope envelope = captor.getValue();
        assertThat(envelope.channel()).isEqualTo(MessageEnvelope.CHANNEL_VERSION);
        assertThat(envelope.houseId()).isNull();
        assertThat(envelope.payload().get("value").asText()).isEqualTo("v110");
    }
}
