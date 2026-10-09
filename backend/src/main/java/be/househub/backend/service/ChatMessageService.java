package be.househub.backend.service;

import be.househub.backend.dto.chat.ChatMessageResponse;
import be.househub.backend.entity.ChatMessage;
import be.househub.backend.entity.Household;
import be.househub.backend.entity.User;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.ChatMessageRepository;
import be.househub.backend.repository.HouseholdRepository;
import be.househub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatMessageService {

    private static final int MAX_LIMIT = 200;

    private final ChatMessageRepository chatMessageRepository;
    private final HouseholdRepository householdRepository;
    private final UserRepository userRepository;

    public List<ChatMessageResponse> history(Household household, int limit, Instant before) {
        int clampedLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
        Pageable pageable = PageRequest.of(0, clampedLimit);

        List<ChatMessage> messages = before == null
                ? chatMessageRepository.findByHouseholdIdOrderByCreatedAtDesc(household.getId(), pageable)
                : chatMessageRepository.findByHouseholdIdAndCreatedAtBeforeOrderByCreatedAtDesc(
                        household.getId(), before, pageable);

        return messages.stream().map(this::toResponse).toList();
    }

    @Transactional
    public ChatMessageResponse persist(UUID householdId, UUID senderId, String text) {
        if (text == null || text.trim().isEmpty()) {
            throw new IllegalArgumentException("Chat message text must not be blank");
        }
        String trimmed = text.trim();
        if (trimmed.length() > 2000) {
            throw new IllegalArgumentException("Chat message text must not exceed 2000 characters");
        }

        Household household = householdRepository.findById(householdId)
                .orElseThrow(() -> new ResourceNotFoundException("Household", householdId));
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User", senderId));

        ChatMessage message = new ChatMessage();
        message.setHousehold(household);
        message.setSender(sender);
        message.setText(trimmed);
        message.setCreatedAt(Instant.now());

        return toResponse(chatMessageRepository.save(message));
    }

    private ChatMessageResponse toResponse(ChatMessage message) {
        return new ChatMessageResponse(
                message.getId(),
                message.getHousehold().getId(),
                message.getSender().getId(),
                message.getSender().getDisplayName(),
                message.getText(),
                message.getCreatedAt()
        );
    }
}
