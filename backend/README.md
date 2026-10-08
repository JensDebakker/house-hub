# Backend (Spring Boot)

REST API for the Java Backend Programming subject. See [../docs/IDEAS.md](../docs/IDEAS.md)
for the full requirements and domain model.

Stack: Spring Boot 4.1 (Java 25) · Spring Security + JWT (access + refresh) · Spring Data JPA ·
H2 (dev) / PostgreSQL (docker) · springdoc-openapi (Swagger UI).

## Running locally

```bash
cd backend
./mvnw spring-boot:run     # defaults to the "dev" profile: in-memory H2, no setup needed
```

- API base URL: `http://localhost:8080/api` (matches the frontend's `EXPO_PUBLIC_API_URL`)
- Swagger UI: `http://localhost:8080/api/swagger-ui.html`
- H2 console: `http://localhost:8080/api/h2-console` (JDBC URL `jdbc:h2:mem:househub`, user `sa`, no password)

For the `docker` profile (PostgreSQL), set `SPRING_PROFILES_ACTIVE=docker` plus `DB_HOST`,
`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, and `CORS_ALLOWED_ORIGINS` (the real site
origin, e.g. `https://jensdebakker.com` — defaults to `*` for local dev) — see
[../docker/](../docker/).

## Endpoints

Auth (matches the frontend's existing `src/lib/api.ts` contract exactly):
- `POST /auth/register` — `{ email, password, displayName }` → `{ accessToken, refreshToken, user }`
- `POST /auth/login` — `{ email, password }` → same shape as register
- `POST /auth/refresh` — `{ refreshToken }` → `{ accessToken, refreshToken }`
- `GET /auth/me` — (Bearer token) → `{ id, email, displayName, householdId }`

Household-scoped resources (new — the frontend screens for these still use local mock state,
so these are a first contract, not yet wired up on the frontend side):
- `GET /households/me`
- `GET/POST /tasks`, `PUT/DELETE /tasks/{id}`
- `GET/POST /shopping-lists`, `PUT/DELETE /shopping-lists/{listId}`,
  `POST /shopping-lists/{listId}/items`, `PUT/DELETE /shopping-lists/{listId}/items/{itemId}`
- `GET/POST /supplies`, `PUT/DELETE /supplies/{id}`
- `GET/POST /calendar-events`, `PUT/DELETE /calendar-events/{id}`

All of the above (except `/auth/**`) require `Authorization: Bearer <accessToken>` and are
scoped to the caller's household — registering a new user creates a new household for them.

## Notes

- Error responses are a consistent JSON shape: `{ timestamp, status, error, message, path, fieldErrors }`.
- `jwt.secret` has a dev-only fallback in `application.properties`; override it with `JWT_SECRET`
  everywhere outside local dev.
