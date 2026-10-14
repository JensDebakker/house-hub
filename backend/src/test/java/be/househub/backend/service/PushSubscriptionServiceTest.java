package be.househub.backend.service;

import be.househub.backend.dto.push.PushPreferencesUpdateRequest;
import be.househub.backend.dto.push.PushSubscriptionRequest;
import be.househub.backend.dto.push.PushSubscriptionResponse;
import be.househub.backend.entity.PushSubscription;
import be.househub.backend.entity.User;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.PushSubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PushSubscriptionServiceTest {

    @Mock
    private PushSubscriptionRepository pushSubscriptionRepository;

    private PushSubscriptionService pushSubscriptionService;

    @BeforeEach
    void setUp() {
        pushSubscriptionService = new PushSubscriptionService(pushSubscriptionRepository);
    }

    private User user() {
        User user = new User();
        user.setId(UUID.randomUUID());
        return user;
    }

    @Test
    void subscribe_newEndpoint_createsSubscriptionWithGivenPreferences() {
        User user = user();
        var request = new PushSubscriptionRequest(
                "https://push.example/abc",
                new PushSubscriptionRequest.Keys("p256dh-value", "auth-value"),
                true, false);
        when(pushSubscriptionRepository.findByUserIdAndEndpoint(user.getId(), request.endpoint()))
                .thenReturn(Optional.empty());
        when(pushSubscriptionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        PushSubscriptionResponse response = pushSubscriptionService.subscribe(user, request);

        ArgumentCaptor<PushSubscription> captor = ArgumentCaptor.forClass(PushSubscription.class);
        verify(pushSubscriptionRepository).save(captor.capture());
        PushSubscription saved = captor.getValue();
        assertThat(saved.getUser()).isEqualTo(user);
        assertThat(saved.getEndpoint()).isEqualTo("https://push.example/abc");
        assertThat(saved.getP256dh()).isEqualTo("p256dh-value");
        assertThat(saved.getAuth()).isEqualTo("auth-value");
        assertThat(saved.isNotifyOnVersion()).isTrue();
        assertThat(saved.isNotifyOnChatMessage()).isFalse();
        assertThat(response.notifyOnVersion()).isTrue();
    }

    @Test
    void subscribe_existingEndpointForSameUser_updatesRatherThanDuplicates() {
        User user = user();
        PushSubscription existing = new PushSubscription();
        existing.setId(UUID.randomUUID());
        existing.setUser(user);
        existing.setEndpoint("https://push.example/abc");
        existing.setNotifyOnVersion(false);
        existing.setNotifyOnChatMessage(false);

        var request = new PushSubscriptionRequest(
                "https://push.example/abc",
                new PushSubscriptionRequest.Keys("new-p256dh", "new-auth"),
                true, true);
        when(pushSubscriptionRepository.findByUserIdAndEndpoint(user.getId(), request.endpoint()))
                .thenReturn(Optional.of(existing));
        when(pushSubscriptionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        pushSubscriptionService.subscribe(user, request);

        ArgumentCaptor<PushSubscription> captor = ArgumentCaptor.forClass(PushSubscription.class);
        verify(pushSubscriptionRepository).save(captor.capture());
        assertThat(captor.getValue().getId()).isEqualTo(existing.getId());
        assertThat(captor.getValue().getP256dh()).isEqualTo("new-p256dh");
        assertThat(captor.getValue().isNotifyOnChatMessage()).isTrue();
    }

    @Test
    void updatePreferences_onlyChangesFieldsPresentInRequest() {
        User user = user();
        PushSubscription existing = new PushSubscription();
        existing.setId(UUID.randomUUID());
        existing.setUser(user);
        existing.setEndpoint("https://push.example/abc");
        existing.setNotifyOnVersion(true);
        existing.setNotifyOnChatMessage(true);
        when(pushSubscriptionRepository.findByUserIdAndEndpoint(user.getId(), "https://push.example/abc"))
                .thenReturn(Optional.of(existing));

        var request = new PushPreferencesUpdateRequest("https://push.example/abc", false, null);
        PushSubscriptionResponse response = pushSubscriptionService.updatePreferences(user, request);

        assertThat(response.notifyOnVersion()).isFalse();
        assertThat(response.notifyOnChatMessage()).isTrue(); // left as-is, request didn't mention it
    }

    @Test
    void updatePreferences_endpointBelongsToSomeoneElse_throwsNotFoundNotForbidden() {
        User user = user();
        when(pushSubscriptionRepository.findByUserIdAndEndpoint(user.getId(), "https://push.example/other"))
                .thenReturn(Optional.empty());

        var request = new PushPreferencesUpdateRequest("https://push.example/other", true, null);

        assertThatThrownBy(() -> pushSubscriptionService.updatePreferences(user, request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void unsubscribe_ownedEndpoint_deletes() {
        User user = user();
        PushSubscription existing = new PushSubscription();
        existing.setId(UUID.randomUUID());
        existing.setUser(user);
        existing.setEndpoint("https://push.example/abc");
        when(pushSubscriptionRepository.findByUserIdAndEndpoint(user.getId(), "https://push.example/abc"))
                .thenReturn(Optional.of(existing));

        pushSubscriptionService.unsubscribe(user, "https://push.example/abc");

        verify(pushSubscriptionRepository).deleteByUserIdAndEndpoint(user.getId(), "https://push.example/abc");
    }

    @Test
    void unsubscribe_unknownEndpoint_throwsNotFoundAndDoesNotDelete() {
        User user = user();
        when(pushSubscriptionRepository.findByUserIdAndEndpoint(user.getId(), "https://push.example/unknown"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> pushSubscriptionService.unsubscribe(user, "https://push.example/unknown"))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(pushSubscriptionRepository, never()).deleteByUserIdAndEndpoint(any(), any());
    }
}
