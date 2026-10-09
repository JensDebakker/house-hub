package be.househub.backend.config;

import be.househub.backend.entity.Role;
import be.househub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;

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

    @Value("#{'${app.admin-emails:}'.split(',')}")
    private List<String> adminEmails;

    @Override
    public void run(ApplicationArguments args) {
        adminEmails.stream()
                .map(email -> email.trim())
                .filter(email -> !email.isEmpty())
                .map(email -> email.toLowerCase(Locale.ROOT))
                .forEach(email -> userRepository.findByEmail(email).ifPresent(user -> {
                    if (user.getRole() != Role.ADMIN) {
                        user.setRole(Role.ADMIN);
                        userRepository.save(user);
                        log.info("Promoted existing user {} to ADMIN", email);
                    }
                }));
    }
}
