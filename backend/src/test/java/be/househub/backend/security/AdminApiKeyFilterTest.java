package be.househub.backend.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;

class AdminApiKeyFilterTest {

    private static final String KEY = "test-admin-key";

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void correctKeyOnAdminGetAuthenticatesAsAdmin() throws Exception {
        Authentication auth = run(new AdminApiKeyFilter(KEY), request("GET", "/admin/feedback", KEY));

        assertThat(auth).isNotNull();
        assertThat(auth.getPrincipal()).isEqualTo(AdminApiKeyFilter.PRINCIPAL);
        assertThat(auth.getAuthorities()).extracting(GrantedAuthority::getAuthority).containsExactly("ROLE_ADMIN");
    }

    @Test
    void wrongKeyIsIgnored() throws Exception {
        assertThat(run(new AdminApiKeyFilter(KEY), request("GET", "/admin/feedback", "nope"))).isNull();
    }

    @Test
    void missingHeaderIsIgnored() throws Exception {
        assertThat(run(new AdminApiKeyFilter(KEY), request("GET", "/admin/feedback", null))).isNull();
    }

    @Test
    void nonGetRequestIsIgnoredEvenWithCorrectKey() throws Exception {
        assertThat(run(new AdminApiKeyFilter(KEY), request("PATCH", "/admin/users/1", KEY))).isNull();
        assertThat(run(new AdminApiKeyFilter(KEY), request("DELETE", "/admin/households/1", KEY))).isNull();
    }

    @Test
    void nonAdminPathIsIgnoredEvenWithCorrectKey() throws Exception {
        assertThat(run(new AdminApiKeyFilter(KEY), request("GET", "/households", KEY))).isNull();
    }

    @Test
    void blankConfiguredKeyDisablesFilter() throws Exception {
        assertThat(run(new AdminApiKeyFilter(""), request("GET", "/admin/feedback", ""))).isNull();
        assertThat(run(new AdminApiKeyFilter(null), request("GET", "/admin/feedback", "anything"))).isNull();
    }

    private static MockHttpServletRequest request(String method, String path, String key) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, "/api" + path);
        request.setContextPath("/api");
        if (key != null) {
            request.addHeader(AdminApiKeyFilter.HEADER, key);
        }
        return request;
    }

    private static Authentication run(AdminApiKeyFilter filter, MockHttpServletRequest request) throws Exception {
        SecurityContextHolder.clearContext();
        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());
        return SecurityContextHolder.getContext().getAuthentication();
    }
}
