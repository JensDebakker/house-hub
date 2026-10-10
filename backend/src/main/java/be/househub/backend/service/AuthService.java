package be.househub.backend.service;

import be.househub.backend.config.AdminEmailRegistry;
import be.househub.backend.dto.MessageResponse;
import be.househub.backend.dto.auth.AuthResponse;
import be.househub.backend.dto.auth.ChangePasswordRequest;
import be.househub.backend.dto.auth.ForgotPasswordRequest;
import be.househub.backend.dto.auth.LoginRequest;
import be.househub.backend.dto.auth.RegisterRequest;
import be.househub.backend.dto.auth.RegisterResponse;
import be.househub.backend.dto.auth.ResetPasswordRequest;
import be.househub.backend.dto.auth.TokenResponse;
import be.househub.backend.dto.auth.UserResponse;
import be.househub.backend.dto.household.HouseholdMembershipResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.entity.HouseholdMembership;
import be.househub.backend.entity.HouseholdRole;
import be.househub.backend.entity.Role;
import be.househub.backend.entity.User;
import be.househub.backend.entity.VerificationToken;
import be.househub.backend.entity.VerificationTokenType;
import be.househub.backend.exception.DuplicateEmailException;
import be.househub.backend.exception.EmailNotVerifiedException;
import be.househub.backend.exception.InvalidTokenException;
import be.househub.backend.exception.InvalidVerificationTokenException;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.HouseholdMembershipRepository;
import be.househub.backend.repository.HouseholdRepository;
import be.househub.backend.repository.UserRepository;
import be.househub.backend.repository.VerificationTokenRepository;
import be.househub.backend.security.JwtService;
import be.househub.backend.service.storage.FileStorageService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final long EMAIL_VERIFY_TTL_HOURS = 24;
    private static final long PASSWORD_RESET_TTL_HOURS = 1;
    private static final long EMAIL_VERIFY_REPLAY_WINDOW_HOURS = 1;

    private final UserRepository userRepository;
    private final HouseholdRepository householdRepository;
    private final HouseholdMembershipRepository membershipRepository;
    private final HouseholdService householdService;
    private final VerificationTokenRepository verificationTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final MailService mailService;
    private final FileStorageService fileStorageService;
    private final AdminEmailRegistry adminEmailRegistry;

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateEmailException(email);
        }

        Household household = new Household();
        household.setName(request.displayName() + "'s household");
        household.setInviteCode(householdService.generateInviteCode());
        household = householdRepository.save(household);

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDisplayName(request.displayName());
        user.setRole(isConfiguredAdminEmail(email) ? Role.ADMIN : Role.USER);
        final User savedUser = userRepository.save(user);

        HouseholdMembership membership = new HouseholdMembership();
        membership.setUser(savedUser);
        membership.setHousehold(household);
        membership.setRole(HouseholdRole.OWNER);
        membershipRepository.save(membership);

        issueAndSendToken(savedUser, VerificationTokenType.EMAIL_VERIFY, EMAIL_VERIFY_TTL_HOURS,
                token -> mailService.sendVerificationEmail(savedUser.getEmail(), token));

        return new RegisterResponse("Registered. Check your email to verify your account before logging in.", email);
    }

    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
        } catch (org.springframework.security.core.AuthenticationException ex) {
            throw new BadCredentialsException("Invalid email or password");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!user.isEmailVerified()) {
            throw new EmailNotVerifiedException();
        }

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

    @Transactional
    public AuthResponse verifyEmail(String rawToken) {
        VerificationToken token = verificationTokenRepository.findByToken(rawToken)
                .orElseThrow(() -> new InvalidVerificationTokenException("Invalid or already-used token"));

        if (token.getType() != VerificationTokenType.EMAIL_VERIFY) {
            throw new InvalidVerificationTokenException("Invalid or already-used token");
        }

        User user = token.getUser();

        // A used email-verify token whose user is already verified means this exact
        // token already succeeded once (tokens are single-use and unique per
        // register/resend call) - a replay (double-submit, double-click) within the
        // replay window should log the user in rather than error. Past that window the
        // token reverts to erroring, so a copy of the link leaked later (access logs,
        // browser history, a forward) can't be used to log in indefinitely.
        if (token.isUsed()) {
            boolean withinReplayWindow = token.getUsedAt() != null
                    && token.getUsedAt().plus(Duration.ofHours(EMAIL_VERIFY_REPLAY_WINDOW_HOURS)).isAfter(Instant.now());
            if (user.isEmailVerified() && withinReplayWindow) {
                return buildAuthResponse(user);
            }
            throw new InvalidVerificationTokenException("Invalid or already-used token");
        }

        if (token.isExpired()) {
            throw new InvalidVerificationTokenException("Token has expired");
        }

        token.setUsed(true);
        token.setUsedAt(Instant.now());
        verificationTokenRepository.save(token);

        user.setEmailVerified(true);
        userRepository.save(user);
        return buildAuthResponse(user);
    }

    @Transactional
    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        String email = normalizeEmail(request.email());
        userRepository.findByEmail(email).ifPresent(user ->
                issueAndSendToken(user, VerificationTokenType.PASSWORD_RESET, PASSWORD_RESET_TTL_HOURS,
                        token -> mailService.sendPasswordResetEmail(user.getEmail(), token)));

        return new MessageResponse("If that email is registered, a password reset link has been sent.");
    }

    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        VerificationToken token = consumeToken(request.token(), VerificationTokenType.PASSWORD_RESET);
        User user = token.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        return new MessageResponse("Password reset successful. You can now log in.");
    }

    @Transactional
    public MessageResponse changePassword(User user, ChangePasswordRequest request) {
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        return new MessageResponse("Password changed successfully.");
    }

    @Transactional
    public UserResponse uploadProfilePicture(User user, MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Profile picture must be an image file");
        }

        String storageKey = "avatars/" + user.getId();
        try {
            fileStorageService.store(storageKey, file.getInputStream(), file.getSize(), contentType);
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }

        user.setProfilePictureKey(storageKey);
        user.setProfilePictureContentType(contentType);
        return toUserResponse(userRepository.save(user));
    }

    public ProfilePicture downloadProfilePicture(User user) {
        if (user.getProfilePictureKey() == null) {
            throw new ResourceNotFoundException("ProfilePicture", user.getId());
        }
        FileStorageService.StoredFile stored = fileStorageService.load(user.getProfilePictureKey());
        return new ProfilePicture(stored, user.getProfilePictureContentType());
    }

    @Transactional
    public UserResponse removeProfilePicture(User user) {
        if (user.getProfilePictureKey() != null) {
            fileStorageService.delete(user.getProfilePictureKey());
            user.setProfilePictureKey(null);
            user.setProfilePictureContentType(null);
            userRepository.save(user);
        }
        return toUserResponse(user);
    }

    public record ProfilePicture(FileStorageService.StoredFile file, String contentType) {
    }

    private VerificationToken consumeToken(String rawToken, VerificationTokenType expectedType) {
        VerificationToken token = verificationTokenRepository.findByToken(rawToken)
                .orElseThrow(() -> new InvalidVerificationTokenException("Invalid or already-used token"));

        if (token.isUsed() || token.getType() != expectedType) {
            throw new InvalidVerificationTokenException("Invalid or already-used token");
        }
        if (token.isExpired()) {
            throw new InvalidVerificationTokenException("Token has expired");
        }

        token.setUsed(true);
        token.setUsedAt(Instant.now());
        verificationTokenRepository.save(token);
        return token;
    }

    private void issueAndSendToken(User user, VerificationTokenType type, long ttlHours, java.util.function.Consumer<String> sendFn) {
        VerificationToken token = new VerificationToken();
        token.setToken(UUID.randomUUID().toString());
        token.setType(type);
        token.setUser(user);
        token.setExpiresAt(Instant.now().plus(ttlHours, ChronoUnit.HOURS));
        verificationTokenRepository.save(token);
        sendFn.accept(token.getToken());
    }

    private boolean isConfiguredAdminEmail(String email) {
        return adminEmailRegistry.isAdmin(email);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);
        return new AuthResponse(accessToken, refreshToken, toUserResponse(user));
    }

    private UserResponse toUserResponse(User user) {
        List<HouseholdMembershipResponse> households = membershipRepository.findByUserId(user.getId()).stream()
                .map(m -> new HouseholdMembershipResponse(m.getHousehold().getId(), m.getHousehold().getName(), m.getRole()))
                .toList();
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole(),
                households,
                user.isEmailVerified(),
                user.getProfilePictureKey() != null
        );
    }
}
