package be.househub.backend.controller;

import be.househub.backend.config.SecurityConfig;
import be.househub.backend.dto.shopping.ShoppingListItemRequest;
import be.househub.backend.dto.shopping.ShoppingListItemResponse;
import be.househub.backend.dto.shopping.ShoppingListRequest;
import be.househub.backend.dto.shopping.ShoppingListResponse;
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
import be.househub.backend.service.ShoppingListService;
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

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ShoppingListController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, RestAuthenticationEntryPoint.class, RestAccessDeniedHandler.class})
class ShoppingListControllerTest {

    private static final String VALID_TOKEN = "valid-token";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ShoppingListService shoppingListService;
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
    void findAll_authenticatedMember_returnsShoppingLists() throws Exception {
        ShoppingListResponse response = new ShoppingListResponse(UUID.randomUUID(), "Groceries", List.of());
        when(householdAccessService.requireAccess(eq(currentUser), eq(householdId))).thenReturn(household);
        when(shoppingListService.findAll(household)).thenReturn(List.of(response));

        mockMvc.perform(get("/households/{householdId}/shopping-lists", householdId)
                        .header("Authorization", "Bearer " + VALID_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Groceries"));
    }

    @Test
    void findAll_missingAuthorizationHeader_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/households/{householdId}/shopping-lists", householdId))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void addItem_authenticatedMember_returnsUpdatedList() throws Exception {
        UUID listId = UUID.randomUUID();
        ShoppingListItemRequest request = new ShoppingListItemRequest("Eggs", false);
        ShoppingListResponse response = new ShoppingListResponse(listId, "Groceries",
                List.of(new ShoppingListItemResponse(UUID.randomUUID(), "Eggs", false)));
        when(householdAccessService.requireAccess(eq(currentUser), eq(householdId))).thenReturn(household);
        when(shoppingListService.addItem(eq(household), eq(listId), any(ShoppingListItemRequest.class))).thenReturn(response);

        mockMvc.perform(post("/households/{householdId}/shopping-lists/{listId}/items", householdId, listId)
                        .header("Authorization", "Bearer " + VALID_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].label").value("Eggs"));
    }

    @Test
    void removeItem_nonMemberUser_returnsForbidden() throws Exception {
        UUID listId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        when(householdAccessService.requireAccess(eq(currentUser), eq(householdId)))
                .thenThrow(new AccessDeniedException("You are not a member of this household"));

        mockMvc.perform(delete("/households/{householdId}/shopping-lists/{listId}/items/{itemId}", householdId, listId, itemId)
                        .header("Authorization", "Bearer " + VALID_TOKEN))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You are not a member of this household"));
    }

    @Test
    void rename_blankName_returnsBadRequest() throws Exception {
        UUID listId = UUID.randomUUID();
        ShoppingListRequest invalidRequest = new ShoppingListRequest("");

        mockMvc.perform(put("/households/{householdId}/shopping-lists/{listId}", householdId, listId)
                        .header("Authorization", "Bearer " + VALID_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_validRequest_returnsCreatedShoppingList() throws Exception {
        ShoppingListRequest request = new ShoppingListRequest("Weekly groceries");
        ShoppingListResponse response = new ShoppingListResponse(UUID.randomUUID(), "Weekly groceries", List.of());
        when(householdAccessService.requireAccess(eq(currentUser), eq(householdId))).thenReturn(household);
        when(shoppingListService.create(eq(household), any(ShoppingListRequest.class))).thenReturn(response);

        mockMvc.perform(post("/households/{householdId}/shopping-lists", householdId)
                        .header("Authorization", "Bearer " + VALID_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Weekly groceries"));
    }
}
