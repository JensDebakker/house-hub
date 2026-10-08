package be.househub.backend.service;

import be.househub.backend.dto.auth.AuthResponse;
import be.househub.backend.dto.auth.LoginRequest;
import be.househub.backend.dto.auth.RegisterRequest;
import be.househub.backend.dto.auth.TokenResponse;
import be.househub.backend.dto.auth.UserResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.entity.User;
import be.househub.backend.exception.DuplicateEmailException;
import be.househub.backend.exception.InvalidTokenException;
import be.househub.backend.repository.HouseholdRepository;
import be.househub.backend.repository.UserRepository;
import be.househub.backend.security.JwtService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final HouseholdRepository householdRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateEmailException(request.email());
        }

        Household household = new Household();
        household.setName(request.displayName() + "'s household");
        household = householdRepository.save(household);

        User user = new User();
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDisplayName(request.displayName());
        user.setHousehold(household);
        user = userRepository.save(user);

        return buildAuthResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        } catch (org.springframework.security.core.AuthenticationException ex) {
            throw new BadCredentialsException("Invalid email or password");
        }

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        return buildAuthResponse(user);
    }

    public TokenResponse refresh(String refreshToken) {
        Claims claims = jwtService.parseClaims(refreshToken);
        if (!jwtService.isRefreshToken(claims)) {
            throw new InvalidTokenException("Token is not a refresh token");
        }

        User user = userRepository.findByEmail(jwtService.extractEmail(claims))
                .orElseThrow(() -> new InvalidTokenException("User no longer exists"));

        return new TokenResponse(jwtService.generateAccessToken(user), jwtService.generateRefreshToken(user));
    }

    public UserResponse currentUser(User user) {
        return toUserResponse(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);
        return new AuthResponse(accessToken, refreshToken, toUserResponse(user));
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getDisplayName(), user.getHousehold().getId());
    }
}
