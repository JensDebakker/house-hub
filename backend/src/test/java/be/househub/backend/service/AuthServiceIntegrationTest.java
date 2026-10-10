package be.househub.backend.service;

import be.househub.backend.dto.auth.AuthResponse;
import be.househub.backend.dto.auth.RegisterRequest;
import be.househub.backend.dto.auth.RegisterResponse;
import be.househub.backend.entity.HouseholdMembership;
import be.househub.backend.entity.HouseholdRole;
import be.househub.backend.entity.User;
import be.househub.backend.entity.VerificationTokenType;
import be.househub.backend.exception.InvalidVerificationTokenException;
import be.househub.backend.repository.HouseholdMembershipRepository;
import be.househub.backend.repository.UserRepository;
import be.househub.backend.repository.VerificationTokenRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Exercises the real JPA/repository layer (unlike the {@code @WebMvcTest} controller tests,
 * which mock services) against whichever datasource the active profile points at - H2 locally,
 * real Postgres in CI. Registration previously failed in production only against Postgres,
 * because of a column ({@code household_role}) that existed on the live table but not in any
 * migration or entity - a drift no amount of H2-only or mocked testing could have caught, but
 * this at least guards the same insert path against future regressions.
 */
@SpringBootTest
@Transactional
class AuthServiceIntegrationTest {

    @Autowired
    private AuthService authService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private HouseholdMembershipRepository membershipRepository;
    @Autowired
    private VerificationTokenRepository verificationTokenRepository;

    @Test
    void register_validRequest_persistsUserAndOwnerMembership() {
        RegisterRequest request = new RegisterRequest("new.user@example.com", "a-valid-password", "New User");

        RegisterResponse response = authService.register(request);

        assertThat(response.email()).isEqualTo("new.user@example.com");

        User saved = userRepository.findByEmail("new.user@example.com").orElseThrow();
        assertThat(saved.getDisplayName()).isEqualTo("New User");
        assertThat(saved.isEmailVerified()).isFalse();

        List<HouseholdMembership> memberships = membershipRepository.findByUserId(saved.getId());
        assertThat(memberships).hasSize(1);
        assertThat(memberships.get(0).getRole()).isEqualTo(HouseholdRole.OWNER);
    }

    @Test
    void verifyEmail_validToken_marksUserVerifiedAndLogsIn() {
        authService.register(new RegisterRequest("verify.me@example.com", "a-valid-password", "Verify Me"));
        String token = emailVerifyTokenFor("verify.me@example.com");

        AuthResponse response = authService.verifyEmail(token);

        assertThat(response.accessToken()).isNotBlank();
        assertThat(userRepository.findByEmail("verify.me@example.com").orElseThrow().isEmailVerified()).isTrue();
    }

    @Test
    void verifyEmail_replayOfTokenAlreadyUsedByVerifiedUser_logsInInsteadOfThrowing() {
        // Regression test: a double-submit (double-click, a frontend effect firing twice) replays
        // the same already-consumed token. Since tokens are single-use and unique per
        // register/resend call, a used token whose user is already verified means this exact
        // token did its job once already - the replay should log the user in, not error.
        authService.register(new RegisterRequest("replay@example.com", "a-valid-password", "Replay"));
        String token = emailVerifyTokenFor("replay@example.com");
        authService.verifyEmail(token);

        AuthResponse response = authService.verifyEmail(token);

        assertThat(response.accessToken()).isNotBlank();
    }

    @Test
    void verifyEmail_unknownToken_throws() {
        assertThatThrownBy(() -> authService.verifyEmail("not-a-real-token"))
                .isInstanceOf(InvalidVerificationTokenException.class);
    }

    private String emailVerifyTokenFor(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        return verificationTokenRepository.findAll().stream()
                .filter(t -> t.getType() == VerificationTokenType.EMAIL_VERIFY && t.getUser().getId().equals(user.getId()))
                .findFirst()
                .orElseThrow()
                .getToken();
    }
}
