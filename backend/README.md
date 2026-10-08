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
- House files are written under `backend/data/house-files` by default (`app.files.storage-dir`,
  override with `FILES_STORAGE_DIR`) — no extra service needed locally.

For the `docker` profile (PostgreSQL), set `SPRING_PROFILES_ACTIVE=docker` plus `DB_HOST`,
`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, and `CORS_ALLOWED_ORIGINS` (the real site
origin, e.g. `https://jensdebakker.com` — defaults to `*` for local dev) — see
[../docker/](../docker/).

## Endpoints

Auth (matches the frontend's existing `src/lib/api.ts` contract exactly):
- `POST /auth/register` — `{ email, password, displayName }` → `{ accessToken, refreshToken, user }`
- `POST /auth/login` — `{ email, password }` → same shape as register
- `POST /auth/refresh` — `{ refreshToken }` → `{ accessToken, refreshToken }`
- `GET /auth/me` — (Bearer token) → `{ id, email, displayName, role, households, emailVerified }`,
  where `households` is a list of `{ householdId, householdName, role }` — a user can belong to
  more than one household (admin-managed; there's no self-service join flow yet)

Household-scoped resources — every one of these takes `{householdId}` in the path and is
usable by any member of that household, or by an ADMIN for any household (the frontend
screens for these still use local mock state, so these are a contract, not yet wired up on
the frontend side beyond Auth and Admin):
- `GET /households/mine` — the caller's own memberships
- `GET /households/{householdId}`
- `GET/POST /households/{householdId}/tasks`, `PUT/DELETE .../tasks/{id}`
- `GET/POST /households/{householdId}/shopping-lists`, `PUT/DELETE .../shopping-lists/{listId}`,
  `POST .../shopping-lists/{listId}/items`, `PUT/DELETE .../shopping-lists/{listId}/items/{itemId}`
- `GET/POST /households/{householdId}/supplies`, `PUT/DELETE .../supplies/{id}`
- `GET/POST /households/{householdId}/calendar-events`, `PUT/DELETE .../calendar-events/{id}`
- `GET/POST /households/{householdId}/files` (multipart upload), `GET/DELETE .../files/{id}` —
  shared files/images for the household, capped by `Household.storageLimitBytes` (default 4GB,
  admin-editable)

All of the above (except `/auth/**`) require `Authorization: Bearer <accessToken>`.
Registering a new user creates a new household for them (as the OWNER); additional
memberships are granted by an admin via the `/admin/**` endpoints below.

Admin (`ROLE_ADMIN` only):
- `GET /admin/users`, `GET /admin/users/{id}`, `PATCH /admin/users/{id}` (global role)
- `GET /admin/households`, `GET /admin/households/{id}` (full drill-down: members + tasks +
  supplies + shopping lists + calendar events + files), `PATCH /admin/households/{id}` (name,
  storage limit)
- `POST /admin/households/{id}/members`, `PATCH .../members/{userId}`, `DELETE .../members/{userId}`
  — add/change-role/remove a household membership

## Notes

- Error responses are a consistent JSON shape: `{ timestamp, status, error, message, path, fieldErrors }`.
- `jwt.secret` has a dev-only fallback in `application.properties`; override it with `JWT_SECRET`
  everywhere outside local dev.
