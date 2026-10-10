package be.househub.backend.controller;

import be.househub.backend.config.SecurityConfig;
import be.househub.backend.entity.Household;
import be.househub.backend.entity.Role;
import be.househub.backend.entity.User;
import be.househub.backend.security.CustomUserDetailsService;
import be.househub.backend.security.JwtAuthenticationFilter;
import be.househub.backend.security.JwtService;
import be.househub.backend.security.RestAccessDeniedHandler;
import be.househub.backend.security.RestAuthenticationEntryPoint;
import be.househub.backend.security.UserPrincipal;
import be.househub.backend.service.ChatMessageService;
import be.househub.backend.service.HouseholdAccessService;
import be.househub.backend.websocket.MessageEnvelope;
import be.househub.backend.websocket.WebSocketBroadcaster;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ChatMessageController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, RestAuthenticationEntryPoint.class, RestAccessDeniedHandler.class})
class ChatMessageControllerTest {

    private static final String VALID_TOKEN = "valid-token";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ChatMessageService chatMessageService;
    @MockitoBean
    private HouseholdAccessService householdAccessService;
    @MockitoBean
    private WebSocketBroadcaster broadcaster;
    @MockitoBean
    private JwtService jwtService;
    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    private UUID householdId;
    private Household household;
    private User currentUser;

    @BeforeEach
    void setUp() {
        householdId = UUID.randomUUID();
        household = new Household();
        household.setId(householdId);

        currentUser = new User();
        currentUser.setId(UUID.randomUUID());
        currentUser.setEmail("member@example.com");
        currentUser.setRole(Role.USER);

        Claims claims = mock(Claims.class);
        when(jwtService.parseClaims(VALID_TOKEN)).thenReturn(claims);
        when(jwtService.isAccessToken(claims)).thenReturn(true);
        when(jwtService.extractEmail(claims)).thenReturn(currentUser.getEmail());
        when(customUserDetailsService.loadUserByUsername(currentUser.getEmail())).thenReturn(new UserPrincipal(currentUser));
    }

    @Test
    void delete_success_broadcastsDeletedEventToHouse() throws Exception {
        UUID messageId = UUID.randomUUID();
        when(householdAccessService.requireAccess(eq(currentUser), eq(householdId))).thenReturn(household);
        doNothing().when(chatMessageService).delete(eq(household), eq(messageId), eq(currentUser));

        mockMvc.perform(delete("/households/{householdId}/chat-messages/{id}", householdId, messageId)
                        .header("Authorization", "Bearer " + VALID_TOKEN))
                .andExpect(status().isNoContent());

        verify(chatMessageService).delete(household, messageId, currentUser);
        verify(broadcaster).broadcastToHouse(eq(householdId), any(MessageEnvelope.class));
    }

    @Test
    void delete_notSenderNorOwner_returnsForbiddenAndDoesNotBroadcast() throws Exception {
        UUID messageId = UUID.randomUUID();
        when(householdAccessService.requireAccess(eq(currentUser), eq(householdId))).thenReturn(household);
        doThrow(new AccessDeniedException("Only the sender or a household owner can delete this message"))
                .when(chatMessageService).delete(eq(household), eq(messageId), eq(currentUser));

        mockMvc.perform(delete("/households/{householdId}/chat-messages/{id}", householdId, messageId)
                        .header("Authorization", "Bearer " + VALID_TOKEN))
                .andExpect(status().isForbidden());

        verify(broadcaster, never()).broadcastToHouse(any(), any(MessageEnvelope.class));
    }

    @Test
    void delete_nonMemberUser_returnsForbidden() throws Exception {
        UUID messageId = UUID.randomUUID();
        when(householdAccessService.requireAccess(eq(currentUser), eq(householdId)))
                .thenThrow(new AccessDeniedException("You are not a member of this household"));

        mockMvc.perform(delete("/households/{householdId}/chat-messages/{id}", householdId, messageId)
                        .header("Authorization", "Bearer " + VALID_TOKEN))
                .andExpect(status().isForbidden());

        verify(broadcaster, never()).broadcastToHouse(any(), any(MessageEnvelope.class));
    }
}
