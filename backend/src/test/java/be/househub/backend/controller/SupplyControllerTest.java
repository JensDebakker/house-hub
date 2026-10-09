package be.househub.backend.controller;

import be.househub.backend.config.SecurityConfig;
import be.househub.backend.dto.supply.SupplyRequest;
import be.househub.backend.dto.supply.SupplyResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.entity.Role;
import be.househub.backend.entity.User;
import be.househub.backend.security.CustomUserDetailsService;
import be.househub.backend.security.JwtAuthenticationFilter;
import be.househub.backend.security.JwtService;
import be.househub.backend.security.RestAccessDeniedHandler;
import be.househub.backend.security.RestAuthenticationEntryPoint;
import be.househub.backend.security.UserPrincipal;
import be.househub.backend.service.HouseholdAccessService;
import be.househub.backend.service.SupplyService;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SupplyController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, RestAuthenticationEntryPoint.class, RestAccessDeniedHandler.class})
class SupplyControllerTest {

    private static final String VALID_TOKEN = "valid-token";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private SupplyService supplyService;
    @MockitoBean
    private HouseholdAccessService householdAccessService;
    @MockitoBean
    private JwtService jwtService;
    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    private UUID householdId;
    private Household household;
    private User currentUser;

    @BeforeEach
    void setUp() {
        householdId = UUID.randomUUID();
        household = new Household();
        household.setId(householdId);

        currentUser = new User();
        currentUser.setId(UUID.randomUUID());
        currentUser.setEmail("member@example.com");
        currentUser.setRole(Role.USER);

        Claims claims = mock(Claims.class);
        when(jwtService.parseClaims(VALID_TOKEN)).thenReturn(claims);
        when(jwtService.isAccessToken(claims)).thenReturn(true);
        when(jwtService.extractEmail(claims)).thenReturn(currentUser.getEmail());
        when(customUserDetailsService.loadUserByUsername(currentUser.getEmail())).thenReturn(new UserPrincipal(currentUser));
    }

    @Test
    void findAll_authenticatedMember_returnsSupplies() throws Exception {
        SupplyResponse response = new SupplyResponse(UUID.randomUUID(), "Flour", 2, LocalDate.now().plusDays(10));
        when(householdAccessService.requireAccess(eq(currentUser), eq(householdId))).thenReturn(household);
        when(supplyService.findAll(household)).thenReturn(List.of(response));

        mockMvc.perform(get("/households/{householdId}/supplies", householdId)
                        .header("Authorization", "Bearer " + VALID_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Flour"));
    }

    @Test
    void findAll_missingAuthorizationHeader_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/households/{householdId}/supplies", householdId))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void create_nonMemberUser_returnsForbidden() throws Exception {
        when(householdAccessService.requireAccess(eq(currentUser), eq(householdId)))
                .thenThrow(new AccessDeniedException("You are not a member of this household"));
        SupplyRequest request = new SupplyRequest("Sugar", 5, LocalDate.now().plusDays(30));

        mockMvc.perform(post("/households/{householdId}/supplies", householdId)
                        .header("Authorization", "Bearer " + VALID_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You are not a member of this household"));
    }

    @Test
    void create_validRequest_returnsCreatedSupply() throws Exception {
        SupplyRequest request = new SupplyRequest("Sugar", 5, LocalDate.now().plusDays(30));
        SupplyResponse response = new SupplyResponse(UUID.randomUUID(), "Sugar", 5, request.expiryDate());
        when(householdAccessService.requireAccess(eq(currentUser), eq(householdId))).thenReturn(household);
        when(supplyService.create(eq(household), any(SupplyRequest.class))).thenReturn(response);

        mockMvc.perform(post("/households/{householdId}/supplies", householdId)
                        .header("Authorization", "Bearer " + VALID_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Sugar"));
    }

    @Test
    void create_blankName_returnsBadRequest() throws Exception {
        SupplyRequest invalidRequest = new SupplyRequest("", 5, LocalDate.now().plusDays(30));

        mockMvc.perform(post("/households/{householdId}/supplies", householdId)
                        .header("Authorization", "Bearer " + VALID_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void delete_nonMemberUser_returnsForbidden() throws Exception {
        UUID supplyId = UUID.randomUUID();
        when(householdAccessService.requireAccess(eq(currentUser), eq(householdId)))
                .thenThrow(new AccessDeniedException("You are not a member of this household"));

        mockMvc.perform(delete("/households/{householdId}/supplies/{id}", householdId, supplyId)
                        .header("Authorization", "Bearer " + VALID_TOKEN))
                .andExpect(status().isForbidden());
    }
}
