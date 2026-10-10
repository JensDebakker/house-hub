# House Hub — Agent Instructions

Household management tool + smart-screen screensaver. Three independent layers that
only meet at the HTTP API contract — treat them as separate projects that happen to
share a repo.

| Layer | Path | Stack |
|---|---|---|
| Backend | `backend/` | Java 21, Spring Boot (Web, Security, Data JPA, Validation, Mail), JWT (jjwt), H2 (dev) / Postgres (docker) |
| Frontend | `frontend/` | Expo / React Native (TypeScript), expo-router, axios |
| Infra | `docker/` | docker-compose (db + backend + frontend + nginx proxy), VPS deploy via `.github/workflows/deploy.yml` |

Full requirements/design: [docs/IDEAS.md](docs/IDEAS.md). Backend endpoints: [backend/README.md](backend/README.md).
Frontend dev/testing (incl. Playwright visual testing): [frontend/README.md](frontend/README.md).

## Dev commands

```bash
# backend — dev profile uses in-memory H2, no setup needed
cd backend && ./mvnw spring-boot:run

# frontend
cd frontend && npm install && npm run web   # or android / ios
```

## Checking live database state

Before writing a migration, or when debugging anything that smells DB-related (a
constraint violation, an unexpected 500 on an insert/update), check the database's
*actual* current state rather than assuming it matches the entities or the Flyway
migration files — those two things have already drifted apart in this repo once
(see `V20261010142700__drop_legacy_user_household_columns.sql`: `ddl-auto=update`-era
columns survived on the live table for months after their entity fields were removed,
undetected by Hibernate validation or any test, and broke every registration).

Two admin-only (`ROLE_ADMIN`) endpoints exist specifically for this, reusing the
existing JWT auth — no separate DB credentials, MCP server, or SSH tunnel needed:

- `GET /admin/database/health` — connectivity check with response time; `DOWN` + the
  error message on failure instead of a generic 500.
- `GET /admin/database/schema` — the live schema exactly as JDBC `DatabaseMetaData`
  reports it (tables, columns, types, nullability, primary/foreign keys), independent
  of what the entities or migrations claim. No row data, shape only.

Call these (with an admin account's access token) before trusting that a migration
file or an entity's mapping matches what's actually on disk — especially on `master`
after a merge you didn't write, or before debugging a schema-shaped production error.

## Git discipline

**Always work on its own feature branch, never directly on `master`.** This applies to
every change, not just non-trivial ones. Before editing, create (or switch to) a branch
named after the feature/task, branched off latest `master` — e.g. `feature/supplies-crud`,
`agent/frontend-shopping-list-wiring`. This repo is routinely worked on by more than one
agent/session at a time sharing the same checkout on disk, so prefer an isolated `git
worktree` per branch over switching branches in that shared working directory — one agent
checking out a different branch there changes the files out from under whoever else is
mid-edit.

**Once you're on your own feature branch, commit and push to *that branch* freely** — no
need to ask before each commit/push to your own branch.

- **Commit each committable step as you go**, rather than batching everything into one
  commit at the end. A "committable step" is a point where the tree builds/tests cleanly
  and represents one coherent piece of work (one endpoint, one screen, one fix) — commit
  there rather than carrying a large uncommitted diff.
- **Push your branch whenever it's in a mergeable state** — i.e. it builds and the commits
  are clean/coherent, even if the overall feature isn't finished yet. Don't sit on pushes
  until the very end; a pushed branch is visible and recoverable, an uncommitted local diff
  is not. "Mergeable" here means mergeable into *your own branch's history* — whether it's
  also ready to merge into `master` is decided separately, per below.

**By default, review and merge your own feature's PR into `master` yourself once it's
ready** — don't wait for the user to ask or to do it themselves. "Ready" means: the branch
builds, the relevant layer's tests/checks pass, and you've actually reviewed the diff (e.g.
via `/code-review`, or an equivalent careful read-through) rather than merging on faith just
because you wrote it. Still never force-push to `master`. If the change is risky,
destructive, touches shared infra you're unsure about, or the user said they want to review
this particular one themselves, stop and ask before merging instead of merging through it —
this default doesn't override the general rule of checking before hard-to-reverse,
shared-impact actions.

**Before resuming work on an existing branch/worktree, confirm it's still alive.** A
worktree sitting on disk has no idea its branch was merged three commits ago — merging on
GitHub doesn't touch the local checkout at all. Check via the GitHub MCP tools
(`mcp__github-jens__list_pull_requests` / `pull_request_read`) whether its PR already
merged, or diff it against latest `master`. If it's already merged, stop committing to it:
pull latest `master` and cut a new branch for any further work instead.

**Open your own PR via the GitHub MCP tools once your feature is ready for review** —
`mcp__github-jens__create_pull_request` targeting `master` — rather than waiting for the
user to open it. Then review and merge it yourself by default, per above.

**Never `git add -A` / `git add .` on this repo, even when asked to commit.** Multiple
agents routinely share this one working directory (see below) — a broad add can silently
sweep up another agent's in-progress, unreviewed edits into your commit. Stage named paths
you specifically authored/reviewed, and run `git status` first to see what else is sitting
in the tree before touching any of it.

## Branch lifecycle after merge

Once a PR merges into `master` (by you, which is the default now, or by the user if they
chose to handle that one themselves):

- **Delete the branch, both places**: `git push origin --delete <branch>` and
  `git branch -D <branch>` locally. A squash-merged branch isn't fast-forward-reachable
  from itself anymore, so the local delete needs `-D` (force), not `-d` — that's expected,
  not a sign anything went wrong.
- **Remove its worktree immediately**: `git worktree remove <path>`. A merged worktree left
  lying around is the single biggest cause of an agent waking up and committing to a branch
  that's already dead — the merge happened on GitHub and never touched the worktree, so an
  agent resuming there has no way to tell its branch is gone unless it checks (see above).
- **No separate archive step first.** With squash merges, the squash commit on `master`
  already contains the branch's full diff, so there's nothing extra to lose by deleting.
  Recovering it later is `git revert <squash-sha>`; the closed PR's "Restore branch" button
  on GitHub covers the short-term case too.

## Working alongside other agents/sessions on this repo

This repo gets worked on by more than one agent/session at the same time — possibly a
different AI coding tool entirely, not just another instance of the same one — sharing the
*same checkout on disk*. That has already caused a real incident: two sessions
independently built the same feature (same class names, same design) because neither
checked for the other, one session's commit swept up the other's uncommitted work, and a
shared file was left broken mid-edit when both wrote to it concurrently. Concretely:

- **Check for other active agents/sessions and existing branches before starting
  non-trivial work.** If another one is active on this repo, say so to the user before
  diving in, and coordinate scope (e.g. "I'll take the backend, you take the frontend
  wiring") rather than both building the same thing independently. Check existing branches
  (`git branch -a`) for one that already covers the feature you're about to start, since
  each feature now gets its own branch.
- **An unexpected on-disk change is not automatically "someone's deliberate edit you should
  build on"** — on this repo specifically, first consider whether it means another
  agent/session is *actively, concurrently* writing the same file right now. If a file
  you're mid-edit on keeps changing under you, or comes back with inconsistent state
  (missing imports, half-applied rewrites), stop editing that file and let the user decide
  who finishes it.
- **If you discover a sibling already built (or is building) the same thing you were asked
  to build** — same entities/classes/endpoints, same screens — stop and say so to the user
  instead of silently proceeding in parallel. Duplicated, uncoordinated implementations of
  the same feature are worse than asking first.
- Otherwise, split by layer as below so two agents have no reason to touch the same files
  in the first place.

## Multi-agent work on this repo

This repo is routinely worked on by multiple agents in parallel. Because the three layers
are loosely coupled, split work **by layer, not by feature** whenever a task spans more
than one:

- **One agent per layer per task.** A feature that touches both backend and frontend is
  two agents, not one — e.g. "add Supplies CRUD endpoints" (backend) and "wire the Supplies
  screen to the new endpoints" (frontend), run sequentially or with the frontend agent
  given the finalized DTO shapes up front.
- **The sync point is the API contract**, not shared code: Spring controller/DTO shapes in
  `backend/src/main/java/be/househub/backend/{controller,dto}` on one side, the TypeScript
  types/axios calls in `frontend/src/lib` and `frontend/src/types` on the other. When
  backend and frontend agents run concurrently, freeze the DTO shape first and hand it to
  both rather than letting the frontend agent guess.
- **Don't let one agent edit across layer boundaries** unless the task is explicitly
  cross-cutting (e.g. docker/CI changes, which legitimately touch `docker/` and
  `.github/workflows/`). A backend-focused agent has no reason to touch `frontend/`, and
  vice versa.
- **Name new Flyway migrations `V<yyyyMMddHHmmss>__description.sql`, not the next sequential
  integer.** Checking "what's the latest `V*` on `master`" doesn't work here — each agent is
  on its own branch and can't see a sibling's migration until it merges, so two agents adding
  "the next" migration at the same time will always pick the same number (this happened:
  `V4__add_user_profile_picture.sql` and `V4__add_chat_messages.sql` landed in parallel PRs,
  and Flyway refused to boot at all once both were on `master` — full backend outage). A
  timestamp has no "next" to coincide on, so this is a format fix, not a process one; it
  needs no coordination and no check against anyone else's branch. Flyway treats the digits
  before `__` purely numerically, so e.g. `V20261009224500__...` sorts correctly after the
  existing low integer versions without renumbering anything already merged. Before writing
  a new one, check the live schema via `GET /admin/database/schema` (see "Checking live
  database state" above) rather than assuming the existing migration files are a complete
  picture of what's actually on the table you're changing.
- **Docker/deploy changes (`docker/`, `.github/workflows/deploy.yml`) are their own lane.**
  They depend on env vars defined in `docker/docker-compose.yml` (DB_*, JWT_SECRET, SMTP_*,
  CORS_ALLOWED_ORIGINS, ADMIN_EMAILS) — an agent changing backend config properties that
  are sourced from env must keep compose/CI in sync in the same pass, not leave it to a
  different agent to notice later.
