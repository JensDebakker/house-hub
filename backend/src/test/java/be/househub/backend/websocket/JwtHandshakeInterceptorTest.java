package be.househub.backend.websocket;

import be.househub.backend.entity.Role;
import be.househub.backend.entity.User;
import be.househub.backend.exception.InvalidTokenException;
import be.househub.backend.repository.HouseholdMembershipRepository;
import be.househub.backend.repository.UserRepository;
import be.househub.backend.security.JwtService;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtHandshakeInterceptorTest {

    @Mock
    private JwtService jwtService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private HouseholdMembershipRepository membershipRepository;
    @Mock
    private ServerHttpRequest request;
    @Mock
    private ServerHttpResponse response;
    @Mock
    private WebSocketHandler webSocketHandler;
    @Mock
    private Claims claims;

    private JwtHandshakeInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new JwtHandshakeInterceptor(jwtService, userRepository, membershipRepository);
    }

    private User user(UUID id, Role role) {
        User user = new User();
        user.setId(id);
        user.setRole(role);
        return user;
    }

    @Test
    void beforeHandshake_missingToken_rejectedWithUnauthorized() {
        when(request.getURI()).thenReturn(URI.create("ws://localhost/ws"));

        boolean accepted = interceptor.beforeHandshake(request, response, webSocketHandler, new HashMap<>());

        assertThat(accepted).isFalse();
        verify(response).setStatusCode(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void beforeHandshake_invalidToken_rejectedWithUnauthorized() {
        when(request.getURI()).thenReturn(URI.create("ws://localhost/ws?token=garbage"));
        when(jwtService.parseClaims("garbage")).thenThrow(new InvalidTokenException("bad token"));

        boolean accepted = interceptor.beforeHandshake(request, response, webSocketHandler, new HashMap<>());

        assertThat(accepted).isFalse();
        verify(response).setStatusCode(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void beforeHandshake_validTokenNoHouseId_acceptedAndStashesUserId() {
        UUID userId = UUID.randomUUID();
        when(request.getURI()).thenReturn(URI.create("ws://localhost/ws?token=valid"));
        when(jwtService.parseClaims("valid")).thenReturn(claims);
        when(jwtService.isAccessToken(claims)).thenReturn(true);
        when(jwtService.extractUserId(claims)).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user(userId, Role.USER)));

        Map<String, Object> attributes = new HashMap<>();
        boolean accepted = interceptor.beforeHandshake(request, response, webSocketHandler, attributes);

        assertThat(accepted).isTrue();
        assertThat(attributes).containsEntry(JwtHandshakeInterceptor.ATTR_USER_ID, userId);
        assertThat(attributes).doesNotContainKey(JwtHandshakeInterceptor.ATTR_HOUSE_ID);
    }

    @Test
    void beforeHandshake_validTokenAndMemberHouseId_acceptedAndStashesBoth() {
        UUID userId = UUID.randomUUID();
        UUID houseId = UUID.randomUUID();
        when(request.getURI()).thenReturn(URI.create("ws://localhost/ws?token=valid&houseId=" + houseId));
        when(jwtService.parseClaims("valid")).thenReturn(claims);
        when(jwtService.isAccessToken(claims)).thenReturn(true);
        when(jwtService.extractUserId(claims)).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user(userId, Role.USER)));
        when(membershipRepository.existsByUserIdAndHouseholdId(userId, houseId)).thenReturn(true);

        Map<String, Object> attributes = new HashMap<>();
        boolean accepted = interceptor.beforeHandshake(request, response, webSocketHandler, attributes);

        assertThat(accepted).isTrue();
        assertThat(attributes).containsEntry(JwtHandshakeInterceptor.ATTR_USER_ID, userId);
        assertThat(attributes).containsEntry(JwtHandshakeInterceptor.ATTR_HOUSE_ID, houseId);
    }

    @Test
    void beforeHandshake_validTokenButNotMemberOfHouseId_rejectedWithForbidden() {
        UUID userId = UUID.randomUUID();
        UUID houseId = UUID.randomUUID();
        when(request.getURI()).thenReturn(URI.create("ws://localhost/ws?token=valid&houseId=" + houseId));
        when(jwtService.parseClaims("valid")).thenReturn(claims);
        when(jwtService.isAccessToken(claims)).thenReturn(true);
        when(jwtService.extractUserId(claims)).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user(userId, Role.USER)));
        when(membershipRepository.existsByUserIdAndHouseholdId(userId, houseId)).thenReturn(false);

        boolean accepted = interceptor.beforeHandshake(request, response, webSocketHandler, new HashMap<>());

        assertThat(accepted).isFalse();
        verify(response).setStatusCode(HttpStatus.FORBIDDEN);
    }

    @Test
    void beforeHandshake_adminBypassesMembershipCheck() {
        UUID userId = UUID.randomUUID();
        UUID houseId = UUID.randomUUID();
        when(request.getURI()).thenReturn(URI.create("ws://localhost/ws?token=valid&houseId=" + houseId));
        when(jwtService.parseClaims("valid")).thenReturn(claims);
        when(jwtService.isAccessToken(claims)).thenReturn(true);
        when(jwtService.extractUserId(claims)).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user(userId, Role.ADMIN)));

        Map<String, Object> attributes = new HashMap<>();
        boolean accepted = interceptor.beforeHandshake(request, response, webSocketHandler, attributes);

        assertThat(accepted).isTrue();
        assertThat(attributes).containsEntry(JwtHandshakeInterceptor.ATTR_HOUSE_ID, houseId);
    }
}
