# House Hub

Household management tool + smart-screen screensaver, built across three Howest subjects.
Full requirements and design decisions: [docs/IDEAS.md](docs/IDEAS.md). Full schema:
[docs/ERD.md](docs/ERD.md).

| Folder | Subject | Status |
|---|---|---|
| [frontend/](frontend/) | Cross-Platform Development | scaffolded — auth, tabs, screensaver route |
| [backend/](backend/) | Java Backend Programming | scaffolded — JWT auth + household-scoped CRUD |
| [docker/](docker/) | DevOps | scaffolded — compose stack (db/backend/frontend/proxy), deploy guide |

## Running the backend

```bash
cd backend
./mvnw spring-boot:run   # dev profile: in-memory H2, no setup needed
```

Details, endpoints, and the Postgres/docker profile: [backend/README.md](backend/README.md).

## Running the frontend

```bash
cd frontend
npm install
cp .env.example .env   # EXPO_PUBLIC_API_URL defaults to http://localhost:8080/api
npm run web             # or: npm run android / npm run ios
```

Auth (`/auth/login`, `/auth/register`, `/auth/me`, `/auth/refresh`) now works end-to-end
against the backend above. The Tasks/Shopping/Supplies/Calendar/Screensaver screens still use
local mock state — the backend has matching CRUD endpoints for these (see backend README),
but the frontend isn't wired up to call them yet.
