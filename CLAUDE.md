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

## Git discipline

**All non-trivial work happens on its own feature branch, never directly on `master`.**
Before editing, create (or switch to) a branch named after the feature/task, branched off
latest `master` — e.g. `feature/supplies-crud`, `agent/frontend-shopping-list-wiring`. If
the environment supports git worktrees (`EnterWorktree`/`ExitWorktree`, or the `Agent`
tool's `isolation: "worktree"`), prefer that over switching branches in the shared
checkout — this repo has multiple sessions on one working directory at once (see below),
and one session checking out a different branch there changes the files out from under
whoever else is mid-edit. Use a worktree per branch where the tooling allows it.

**Once you're on your own feature branch, commit and push to *that branch* freely** — no
need to ask the user before each commit/push to your own branch. This applies to every
agent/session working in this repo.

**Never push to `master`, and never merge a branch/PR into `master`, without the user
explicitly asking for it in that turn.** Merging into `master` is a manual, reviewed step.
The user does it themselves, or explicitly asks a specific session to act as "Branch
Master" for that merge (review the branch/PR and merge it into `master`) — it is never
something any agent does on its own as a side effect of finishing a task.

**Never `git add -A` / `git add .` on this repo, even when asked to commit.** Multiple
Claude sessions routinely share this one working directory (see below) — a broad add can
silently sweep up another session's in-progress, unreviewed edits into your commit. Stage
named paths you specifically authored/reviewed, and run `git status` first to see what
else is sitting in the tree before touching any of it.

## Working alongside other Claude sessions on this repo

This repo gets worked on by more than one Claude Code session at the same time — separate
conversations/windows, not just subagents inside one session — sharing the *same checkout
on disk*. That has already caused a real incident: two sessions independently built the
same feature (same class names, same design) because neither checked for the other, one
session's commit swept up the other's uncommitted work, and a shared file was left broken
mid-edit when both wrote to it concurrently. Concretely:

- **Check for a sibling session before starting non-trivial work.** Run `ListAgents` early
  — if another session on this repo shows up, say so to your user before diving in, and
  coordinate scope (e.g. "I'll take the backend, you take the frontend wiring") rather than
  both building the same thing independently. Also check existing branches (`git branch -a`)
  for one that already covers the feature you're about to start, since each feature now
  gets its own branch.
- **An unexpected on-disk change is not automatically "someone's deliberate edit you should
  build on"** — the general assumption that a file changed since you read it reflects
  intentional work still applies, but on *this* repo specifically, first consider whether
  it means a sibling session is *actively, concurrently* writing the same file right now.
  If a file you're mid-edit on keeps changing under you, or comes back with inconsistent
  state (missing imports, half-applied rewrites), stop editing that file, message the other
  session (`SendMessage`) instead of racing it, and let the user decide who finishes it.
- **If you discover a sibling already built (or is building) the same thing you were
  asked to build** — same entities/classes/endpoints, same screens — stop and say so to
  your user instead of silently proceeding in parallel. Duplicated, uncoordinated
  implementations of the same feature are worse than asking first.
- Otherwise, split by layer as below so two sessions have no reason to touch the same
  files in the first place.

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
