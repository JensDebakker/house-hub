package be.househub.backend.service;

import be.househub.backend.entity.ChatMessage;
import be.househub.backend.entity.Household;
import be.househub.backend.entity.User;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.ChatMessageRepository;
import be.househub.backend.repository.HouseholdRepository;
import be.househub.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatMessageServiceTest {

    @Mock
    private ChatMessageRepository chatMessageRepository;
    @Mock
    private HouseholdRepository householdRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private HouseholdAccessService householdAccessService;

    private ChatMessageService chatMessageService;

    @BeforeEach
    void setUp() {
        chatMessageService = new ChatMessageService(
                chatMessageRepository, householdRepository, userRepository, householdAccessService);
    }

    private Household household() {
        Household household = new Household();
        household.setId(UUID.randomUUID());
        return household;
    }

    private User user() {
        User user = new User();
        user.setId(UUID.randomUUID());
        return user;
    }

    private ChatMessage messageFrom(Household household, User sender) {
        ChatMessage message = new ChatMessage();
        message.setId(UUID.randomUUID());
        message.setHousehold(household);
        message.setSender(sender);
        message.setText("hi");
        return message;
    }

    @Test
    void delete_sender_canDeleteOwnMessage() {
        Household household = household();
        User sender = user();
        ChatMessage message = messageFrom(household, sender);
        when(chatMessageRepository.findByIdAndHouseholdId(message.getId(), household.getId()))
                .thenReturn(Optional.of(message));
        when(householdAccessService.isOwner(sender, household.getId())).thenReturn(false);

        assertThatCode(() -> chatMessageService.delete(household, message.getId(), sender))
                .doesNotThrowAnyException();

        verify(chatMessageRepository).delete(message);
    }

    @Test
    void delete_householdOwner_canDeleteSomeoneElsesMessage() {
        Household household = household();
        User sender = user();
        User owner = user();
        ChatMessage message = messageFrom(household, sender);
        when(chatMessageRepository.findByIdAndHouseholdId(message.getId(), household.getId()))
                .thenReturn(Optional.of(message));
        when(householdAccessService.isOwner(owner, household.getId())).thenReturn(true);

        assertThatCode(() -> chatMessageService.delete(household, message.getId(), owner))
                .doesNotThrowAnyException();

        verify(chatMessageRepository).delete(message);
    }

    @Test
    void delete_plainMemberNotSender_throwsAccessDenied() {
        Household household = household();
        User sender = user();
        User otherMember = user();
        ChatMessage message = messageFrom(household, sender);
        when(chatMessageRepository.findByIdAndHouseholdId(message.getId(), household.getId()))
                .thenReturn(Optional.of(message));
        when(householdAccessService.isOwner(otherMember, household.getId())).thenReturn(false);

        assertThatThrownBy(() -> chatMessageService.delete(household, message.getId(), otherMember))
                .isInstanceOf(AccessDeniedException.class);

        verify(chatMessageRepository, never()).delete(any());
    }

    @Test
    void delete_messageNotInHousehold_throwsNotFound() {
        Household household = household();
        User currentUser = user();
        UUID messageId = UUID.randomUUID();
        when(chatMessageRepository.findByIdAndHouseholdId(messageId, household.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> chatMessageService.delete(household, messageId, currentUser))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(chatMessageRepository, never()).delete(any());
    }
}
