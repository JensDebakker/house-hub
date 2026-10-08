package be.househub.backend.security;

import be.househub.backend.entity.User;
import be.househub.backend.exception.InvalidTokenException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private static final String CLAIM_TOKEN_TYPE = "type";
    private static final String CLAIM_USER_ID = "userId";
    private static final String TOKEN_TYPE_ACCESS = "access";
    private static final String TOKEN_TYPE_REFRESH = "refresh";

    private final SecretKey signingKey;
    private final long accessTokenTtlSeconds;
    private final long refreshTokenTtlSeconds;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-token-ttl-seconds}") long accessTokenTtlSeconds,
            @Value("${jwt.refresh-token-ttl-seconds}") long refreshTokenTtlSeconds) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenTtlSeconds = accessTokenTtlSeconds;
        this.refreshTokenTtlSeconds = refreshTokenTtlSeconds;
    }

    public String generateAccessToken(User user) {
        return generateToken(user, TOKEN_TYPE_ACCESS, accessTokenTtlSeconds);
    }

    public String generateRefreshToken(User user) {
        return generateToken(user, TOKEN_TYPE_REFRESH, refreshTokenTtlSeconds);
    }

    private String generateToken(User user, String tokenType, long ttlSeconds) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getEmail())
                .claim(CLAIM_TOKEN_TYPE, tokenType)
                .claim(CLAIM_USER_ID, user.getId().toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(ttlSeconds)))
                .signWith(signingKey)
                .compact();
    }

    public Claims parseClaims(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException ex) {
            throw new InvalidTokenException("Invalid or expired token");
        }
    }

    public String extractEmail(Claims claims) {
        return claims.getSubject();
    }

    public UUID extractUserId(Claims claims) {
        return UUID.fromString(claims.get(CLAIM_USER_ID, String.class));
    }

    public boolean isAccessToken(Claims claims) {
        return TOKEN_TYPE_ACCESS.equals(claims.get(CLAIM_TOKEN_TYPE, String.class));
    }

    public boolean isRefreshToken(Claims claims) {
        return TOKEN_TYPE_REFRESH.equals(claims.get(CLAIM_TOKEN_TYPE, String.class));
    }
}
