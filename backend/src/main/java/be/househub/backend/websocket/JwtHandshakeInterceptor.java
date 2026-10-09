package be.househub.backend.websocket;

import be.househub.backend.entity.Role;
import be.househub.backend.entity.User;
import be.househub.backend.repository.HouseholdMembershipRepository;
import be.househub.backend.repository.UserRepository;
import be.househub.backend.security.JwtService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.MultiValueMap;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;
import java.util.UUID;

/**
 * Authenticates the {@code /ws} handshake the same way {@code JwtAuthenticationFilter}
 * authenticates REST calls — by validating a JWT access token via {@link JwtService} —
 * but since browser/React Native WebSocket clients can't set an Authorization header on
 * the handshake request, the token is read from a query parameter instead:
 * {@code /ws?token=<accessToken>}.
 *
 * <p>An optional {@code houseId} query parameter (e.g. {@code /ws?token=...&houseId=...})
 * scopes the connection to a specific household for household-scoped channels (chat).
 * When present it is verified against the caller's actual membership, same as
 * {@code HouseholdAccessService.requireAccess} does for REST endpoints, and the
 * handshake is rejected if the caller isn't a member. Connections that omit it are still
 * accepted (e.g. to receive house-agnostic "version" pushes) but can't send/receive on
 * household-scoped channels.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    public static final String QUERY_PARAM_TOKEN = "token";
    public static final String QUERY_PARAM_HOUSE_ID = "houseId";

    public static final String ATTR_USER_ID = "userId";
    public static final String ATTR_HOUSE_ID = "houseId";

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final HouseholdMembershipRepository membershipRepository;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                    WebSocketHandler wsHandler, Map<String, Object> attributes) {
        MultiValueMap<String, String> queryParams =
                UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams();

        String token = queryParams.getFirst(QUERY_PARAM_TOKEN);
        if (token == null || token.isBlank()) {
            return reject(response, HttpStatus.UNAUTHORIZED, "Missing token");
        }

        User user;
        try {
            Claims claims = jwtService.parseClaims(token);
            if (!jwtService.isAccessToken(claims)) {
                return reject(response, HttpStatus.UNAUTHORIZED, "Not an access token");
            }
            UUID userId = jwtService.extractUserId(claims);
            user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                return reject(response, HttpStatus.UNAUTHORIZED, "Unknown user");
            }
        } catch (RuntimeException ex) {
            return reject(response, HttpStatus.UNAUTHORIZED, "Invalid or expired token");
        }

        String houseIdParam = queryParams.getFirst(QUERY_PARAM_HOUSE_ID);
        UUID houseId = null;
        if (houseIdParam != null && !houseIdParam.isBlank()) {
            UUID candidate;
            try {
                candidate = UUID.fromString(houseIdParam);
            } catch (IllegalArgumentException ex) {
                return reject(response, HttpStatus.BAD_REQUEST, "Malformed houseId");
            }

            boolean allowed = user.getRole() == Role.ADMIN
                    || membershipRepository.existsByUserIdAndHouseholdId(user.getId(), candidate);
            if (!allowed) {
                return reject(response, HttpStatus.FORBIDDEN, "Not a member of household " + candidate);
            }
            houseId = candidate;
        }

        attributes.put(ATTR_USER_ID, user.getId());
        if (houseId != null) {
            attributes.put(ATTR_HOUSE_ID, houseId);
        }
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                WebSocketHandler wsHandler, Exception exception) {
        // no-op
    }

    private boolean reject(ServerHttpResponse response, HttpStatus status, String reason) {
        log.debug("Rejecting websocket handshake: {}", reason);
        response.setStatusCode(status);
        return false;
    }
}
