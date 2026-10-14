package be.househub.backend.websocket;

import be.househub.backend.entity.PushSubscription;
import be.househub.backend.repository.PushSubscriptionRepository;
import be.househub.backend.service.PushNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VersionBroadcastListenerTest {

    @Mock
    private WebSocketBroadcaster broadcaster;

    @Mock
    private PushSubscriptionRepository pushSubscriptionRepository;

    @Mock
    private PushNotificationService pushNotificationService;

    private VersionBroadcastListener listener;

    @BeforeEach
    void setUp() {
        listener = new VersionBroadcastListener(broadcaster, new ObjectMapper(), pushSubscriptionRepository, pushNotificationService);
        ReflectionTestUtils.setField(listener, "version", "110");
        when(pushSubscriptionRepository.findByNotifyOnVersionTrue()).thenReturn(List.of());
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

    @Test
    void onApplicationReady_sendsPushToEverySubscriptionOptedIntoVersionUpdates() {
        PushSubscription subscription = new PushSubscription();
        subscription.setId(UUID.randomUUID());
        when(pushSubscriptionRepository.findByNotifyOnVersionTrue()).thenReturn(List.of(subscription));

        listener.onApplicationReady();

        ArgumentCaptor<PushNotificationService.PushPayload> payloadCaptor =
                ArgumentCaptor.forClass(PushNotificationService.PushPayload.class);
        verify(pushNotificationService).sendToSubscriptions(eq(List.of(subscription)), payloadCaptor.capture());

        PushNotificationService.PushPayload payload = payloadCaptor.getValue();
        assertThat(payload.body()).contains("v110");
        assertThat(payload.url()).isEqualTo("/app");
    }
}
