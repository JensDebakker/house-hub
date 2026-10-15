package be.househub.backend.controller;

import be.househub.backend.config.SecurityConfig;
import be.househub.backend.dto.push.PushSubscriptionResponse;
import be.househub.backend.entity.Role;
import be.househub.backend.entity.User;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.security.CustomUserDetailsService;
import be.househub.backend.security.JwtAuthenticationFilter;
import be.househub.backend.security.JwtService;
import be.househub.backend.security.RestAccessDeniedHandler;
import be.househub.backend.security.RestAuthenticationEntryPoint;
import be.househub.backend.security.UserPrincipal;
import be.househub.backend.service.PushSubscriptionService;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PushSubscriptionController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, RestAuthenticationEntryPoint.class, RestAccessDeniedHandler.class})
class PushSubscriptionControllerTest {

    private static final String VALID_TOKEN = "valid-token";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PushSubscriptionService pushSubscriptionService;
    @MockitoBean
    private JwtService jwtService;
    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    private User currentUser;

    @BeforeEach
    void setUp() {
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
    void subscribe_success_returnsCreated() throws Exception {
        UUID subscriptionId = UUID.randomUUID();
        when(pushSubscriptionService.subscribe(eq(currentUser), any()))
                .thenReturn(new PushSubscriptionResponse(subscriptionId, "https://push.example/abc", true, true));

        String body = """
                {"endpoint":"https://push.example/abc","keys":{"p256dh":"p256dh-value","auth":"auth-value"},
                 "notifyOnVersion":true,"notifyOnChatMessage":true}
                """;

        mockMvc.perform(post("/push/subscriptions")
                        .header("Authorization", "Bearer " + VALID_TOKEN)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.endpoint").value("https://push.example/abc"))
                .andExpect(jsonPath("$.notifyOnVersion").value(true));
    }

    @Test
    void subscribe_missingKeys_returnsBadRequest() throws Exception {
        String body = """
                {"endpoint":"https://push.example/abc","notifyOnVersion":true,"notifyOnChatMessage":true}
                """;

        mockMvc.perform(post("/push/subscriptions")
                        .header("Authorization", "Bearer " + VALID_TOKEN)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updatePreferences_success_returnsUpdated() throws Exception {
        UUID subscriptionId = UUID.randomUUID();
        when(pushSubscriptionService.updatePreferences(eq(currentUser), any()))
                .thenReturn(new PushSubscriptionResponse(subscriptionId, "https://push.example/abc", false, true));

        String body = """
                {"endpoint":"https://push.example/abc","notifyOnVersion":false}
                """;

        mockMvc.perform(patch("/push/subscriptions")
                        .header("Authorization", "Bearer " + VALID_TOKEN)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifyOnVersion").value(false));
    }

    @Test
    void updatePreferences_unknownEndpoint_returnsNotFound() throws Exception {
        when(pushSubscriptionService.updatePreferences(eq(currentUser), any()))
                .thenThrow(new ResourceNotFoundException("PushSubscription", "https://push.example/unknown"));

        String body = """
                {"endpoint":"https://push.example/unknown","notifyOnVersion":false}
                """;

        mockMvc.perform(patch("/push/subscriptions")
                        .header("Authorization", "Bearer " + VALID_TOKEN)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isNotFound());
    }

    @Test
    void unsubscribe_success_returnsNoContent() throws Exception {
        mockMvc.perform(delete("/push/subscriptions")
                        .header("Authorization", "Bearer " + VALID_TOKEN)
                        .param("endpoint", "https://push.example/abc"))
                .andExpect(status().isNoContent());

        verify(pushSubscriptionService).unsubscribe(currentUser, "https://push.example/abc");
    }
}
