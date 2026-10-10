package be.househub.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Parses the {@code app.admin-emails} configuration property once at construction into a
 * normalized (trimmed, lowercased, blank-filtered) set, so callers don't each re-implement
 * that parsing.
 */
@Component
public class AdminEmailRegistry {

    private final Set<String> normalizedEmails;

    public AdminEmailRegistry(@Value("#{'${app.admin-emails:}'.split(',')}") List<String> adminEmails) {
        this.normalizedEmails = adminEmails.stream()
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toLowerCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());
    }

    /**
     * @param email email to check; compared case-insensitively, whitespace-trimmed
     * @return true if the email is one of the configured admin emails
     */
    public boolean isAdmin(String email) {
        if (email == null) {
            return false;
        }
        return normalizedEmails.contains(email.trim().toLowerCase(Locale.ROOT));
    }

    /**
     * @return the normalized set of configured admin emails
     */
    public Set<String> normalized() {
        return normalizedEmails;
    }
}
