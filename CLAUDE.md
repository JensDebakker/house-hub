# House Hub

Household management tool + smart-screen screensaver. Three independent layers that
only meet at the HTTP API contract — treat them as separate projects that happen to
share a repo.

| Layer | Path | Stack |
|---|---|---|
| Backend | `backend/` | Java 21, Spring Boot (Web, Security, Data JPA, Validation, Mail), JWT (jjwt), H2 (dev) / Postgres (docker) |
| Frontend | `frontend/` | Expo / React Native (TypeScript), expo-router, axios |
| Infra | `docker/` | docker-compose (db + backend + frontend + nginx proxy), VPS deploy via `.github/workflows/deploy.yml` |

Full requirements/design: [docs/IDEAS.md](docs/IDEAS.md). Backend endpoints: [backend/README.md](backend/README.md).

## Dev commands

```bash
# backend — dev profile uses in-memory H2, no setup needed
cd backend && ./mvnw spring-boot:run

# frontend
cd frontend && npm install && npm run web   # or android / ios
```

## Multi-agent work on this repo

This repo is routinely worked on by multiple agents in parallel (background `Agent`
tasks, `Workflow` runs, or separate sessions). Because the three layers are loosely
coupled, split work **by layer, not by feature** whenever a task spans more than one:

- **One agent per layer per task.** A feature that touches both backend and frontend
  is two agents, not one — e.g. "add Supplies CRUD endpoints" (backend) and "wire the
  Supplies screen to the new endpoints" (frontend), run sequentially or with the
  frontend agent given the finalized DTO shapes up front.
- **The sync point is the API contract**, not shared code: Spring controller/DTO
  shapes in `backend/src/main/java/be/househub/backend/{controller,dto}` on one side,
  the TypeScript types/axios calls in `frontend/src/lib` and `frontend/src/types` on
  the other. When backend and frontend agents run concurrently, freeze the DTO shape
  first and hand it to both rather than letting the frontend agent guess.
- **Don't let one agent edit across layer boundaries** unless the task is explicitly
  cross-cutting (e.g. docker/CI changes, which legitimately touch `docker/` and
  `.github/workflows/`). A backend-focused agent has no reason to touch `frontend/`,
  and vice versa.
- **Docker/deploy changes (`docker/`, `.github/workflows/deploy.yml`) are their own
  lane.** They depend on env vars defined in `docker/docker-compose.yml` (DB_*,
  JWT_SECRET, SMTP_*, CORS_ALLOWED_ORIGINS, ADMIN_EMAILS) — an agent changing backend
  config properties that are sourced from env must keep compose/CI in sync in the
  same pass, not leave it to a different agent to notice later.
- Scoped subagents for this: `backend`, `frontend`, `devops` (see `.claude/agents/`).
  Prefer dispatching to those over a generic agent when a task is clearly confined to
  one layer — they're pointed at the right directories and stack already.
