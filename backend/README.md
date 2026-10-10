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

- `GET /version` — public, `{ version }` (e.g. `"v100"`) — shown in the frontend's Settings
  screen. `app.version` is a plain number bumped by `.github/workflows/deploy.yml` on every
  push to master; don't edit it by hand.

Auth (matches the frontend's existing `src/lib/api.ts` contract exactly):
- `POST /auth/register` — `{ email, password, displayName }` → `{ accessToken, refreshToken, user }`
- `POST /auth/login` — `{ email, password }` → same shape as register
- `POST /auth/refresh` — `{ refreshToken }` → `{ accessToken, refreshToken }`
- `GET /auth/me` — (Bearer token) → `{ id, email, displayName, role, households, emailVerified }`,
  where `households` is a list of `{ householdId, householdName, role }` — a user can belong to
  more than one household

Household self-service (join/leave/manage), each usable by any authenticated user unless noted:
- `POST /households` — `{ name }` → 201 + `HouseholdResponse`; creates a brand-new household
  with a freshly generated unique invite code and makes the caller its OWNER
- `POST /households/join` — `{ inviteCode }` → 201 + `HouseholdResponse`; invite code is
  trimmed/uppercased before lookup. 404 if no household matches the code; 409 if the caller is
  already a member of that household. On success the caller becomes a MEMBER
- `POST /households/{householdId}/leave` — 204; caller must already be a member (404/403 via
  the same access check as other household-scoped endpoints otherwise). If the caller is the
  sole member, the membership is deleted and the household is left in place (empty, not
  cascade-deleted). If the caller is an OWNER and no other OWNER remains in the household, 409
  ("last owner" — promote another member first). Otherwise the membership is deleted
- `DELETE /households/{householdId}/members/{userId}` — 204; caller must be an OWNER of that
  household (or ADMIN). 400 if `userId` is the caller's own id (use the leave endpoint instead);
  404 if the target isn't a member of that household
- `GET /households/{householdId}/members` — any existing member (or ADMIN) → 200 +
  `List<{ userId, displayName, email, role }>`

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
- `GET /households/{householdId}/chat-messages` (optional `limit`, default 50, and `before`
  ISO-8601 instant for "load older" pagination) — newest-first history of messages
  persisted from the `chat` websocket channel at `/ws`; there is no REST endpoint to send a
  message, sending only happens over the websocket
- `GET/POST /households/{householdId}/files` (multipart upload, optional `folderId` param to
  place the upload inside a folder), `GET/DELETE .../files/{id}` — shared files/images for the
  household, capped by `Household.storageLimitBytes` (default 4GB, admin-editable). `GET`
  (flat) always returns every file in the household regardless of folder — used by the
  screensaver slideshow and the admin panel. Deleting a file requires being the household
  OWNER or the original uploader.
- `GET /households/{householdId}/folders/contents?parentId={uuid}` (parentId omitted = root) —
  direct children (folders + files) of a folder, `POST .../folders` — create a folder (optional
  `parentFolderId`, omitted = root), `DELETE .../folders/{folderId}` — recursively deletes the
  folder, its files, and its subfolders. Requires being the household OWNER or the folder's
  creator.

All of the above (except `/auth/**`) require `Authorization: Bearer <accessToken>`.
Registering a new user creates a new household for them (as the OWNER); additional
memberships are granted either self-service (see above) or by an admin via the `/admin/**`
endpoints below.

Admin (`ROLE_ADMIN` only):
- `GET /admin/users`, `GET /admin/users/{id}`, `PATCH /admin/users/{id}` (global role)
- `GET /admin/households`, `GET /admin/households/{id}` (full drill-down: members + tasks +
  supplies + shopping lists + calendar events + files), `PATCH /admin/households/{id}` (name,
  storage limit)
- `POST /admin/households/{id}/members`, `PATCH .../members/{userId}`, `DELETE .../members/{userId}`
  — add/change-role/remove a household membership
- `GET /admin/database/health` — connectivity check (`SELECT 1` through the app's own
  datasource) with response time
- `GET /admin/database/schema` — the live schema as JDBC metadata actually reports it
  (tables, columns, types, nullability, primary/foreign keys) rather than what the entities
  or Flyway migrations claim it should be; no row data

## Notes

- Error responses are a consistent JSON shape: `{ timestamp, status, error, message, path, fieldErrors }`.
- `jwt.secret` has a dev-only fallback in `application.properties`; override it with `JWT_SECRET`
  everywhere outside local dev.
