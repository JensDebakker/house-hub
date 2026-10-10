package be.househub.backend.service;

import be.househub.backend.dto.auth.RegisterRequest;
import be.househub.backend.dto.auth.RegisterResponse;
import be.househub.backend.entity.HouseholdMembership;
import be.househub.backend.entity.HouseholdRole;
import be.househub.backend.entity.User;
import be.househub.backend.repository.HouseholdMembershipRepository;
import be.househub.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

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
}
