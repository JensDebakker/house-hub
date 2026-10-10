package be.househub.backend.config;

import be.househub.backend.entity.Role;
import be.househub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Promotes configured admin emails (app.admin-emails) to ADMIN if they already registered
 * before being added to the list. New registrations with a matching email get ADMIN directly
 * in AuthService; this only covers accounts that pre-date the configured email.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AdminSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final AdminEmailRegistry adminEmailRegistry;

    @Override
    public void run(ApplicationArguments args) {
        adminEmailRegistry.normalized()
                .forEach(email -> userRepository.findByEmail(email).ifPresent(user -> {
                    if (user.getRole() != Role.ADMIN) {
                        user.setRole(Role.ADMIN);
                        userRepository.save(user);
                        log.info("Promoted existing user {} to ADMIN", email);
                    }
                }));
    }
}
