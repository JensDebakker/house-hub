package be.househub.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jspecify.annotations.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Lets tools (scripts, agents) call the admin API with a static key instead of a user's JWT:
 * a request carrying {@code X-Admin-Api-Key: <app.admin-api-key>} is authenticated as ADMIN.
 * Deliberately narrow - it only applies to GET requests under /admin/** plus deleting a single
 * feedback ticket (DELETE /admin/feedback/{id}, for cleaning up spam); any other request with
 * the header is left unauthenticated. Disabled entirely when no key is configured.
 */
public class AdminApiKeyFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Admin-Api-Key";
    static final String PRINCIPAL = "admin-api-key";
    private static final Pattern FEEDBACK_TICKET_PATH = Pattern.compile("^/admin/feedback/[0-9a-fA-F-]{36}$");

    private final byte[] apiKey;

    public AdminApiKeyFilter(String apiKey) {
        this.apiKey = apiKey == null || apiKey.isBlank() ? null : apiKey.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        String provided = request.getHeader(HEADER);

        if (apiKey != null && provided != null && isAllowedRequest(request)
                && SecurityContextHolder.getContext().getAuthentication() == null
                && MessageDigest.isEqual(apiKey, provided.getBytes(StandardCharsets.UTF_8))) {
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    PRINCIPAL, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }

    private static boolean isAllowedRequest(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        return switch (request.getMethod()) {
            case "GET" -> path.startsWith("/admin/");
            case "DELETE" -> FEEDBACK_TICKET_PATH.matcher(path).matches();
            default -> false;
        };
    }
}
