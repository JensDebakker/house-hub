package be.househub.backend.controller;

import be.househub.backend.dto.chat.ChatMessageDeletedEvent;
import be.househub.backend.dto.chat.ChatMessageResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.security.SecurityUtils;
import be.househub.backend.service.ChatMessageService;
import be.househub.backend.service.HouseholdAccessService;
import be.househub.backend.websocket.MessageEnvelope;
import be.househub.backend.websocket.WebSocketBroadcaster;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/households/{householdId}/chat-messages")
@RequiredArgsConstructor
public class ChatMessageController {

    private final ChatMessageService chatMessageService;
    private final HouseholdAccessService householdAccessService;
    private final WebSocketBroadcaster broadcaster;
    private final ObjectMapper objectMapper;

    @GetMapping
    public List<ChatMessageResponse> history(
            @PathVariable UUID householdId,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(required = false) Instant before) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        return chatMessageService.history(household, limit, before);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID householdId, @PathVariable UUID id) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        chatMessageService.delete(household, id, SecurityUtils.getCurrentUser());

        MessageEnvelope envelope = MessageEnvelope.of(
                MessageEnvelope.CHANNEL_CHAT, householdId,
                objectMapper.valueToTree(new ChatMessageDeletedEvent(id, householdId)));
        broadcaster.broadcastToHouse(householdId, envelope);

        return ResponseEntity.noContent().build();
    }
}
