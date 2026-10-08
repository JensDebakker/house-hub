# House Hub — Project Ideas & Requirements

School project combining three subjects into one app:

- **Cross-Platform Development** → React Native (Expo), targeting iOS, Android, and Web
- **Java Backend Programming** → Spring Boot REST API
- **DevOps** → Dockerized deployment (app + backend + db via docker-compose)

## Concept

A household management tool with two faces:

1. **Screensaver / smart-screen display** — a kiosk-style view meant to run full-screen in a
   browser on a wall-mounted tablet/smart screen. Shows a rotating photo slideshow (with
   optional music playlist), plus at-a-glance info (today's tasks, calendar, low-stock
   warnings).
2. **Input app** (phone/tablet/web) — where household members log in and manage the data that
   feeds the screensaver: routines/tasks, shopping lists, medication supply + expiry tracking,
   calendar events, and the photo/music playlists for the screensaver.

### Feature list

- **Auth** — household members register/log in; JWT-secured so the web-deployed app and the
  screensaver endpoint can talk to the backend safely.
- **Households** — a user belongs to a household; data (tasks, lists, photos, supplies) is
  scoped per household so multiple families can use the same deployment.
- **Screensaver**
  - Photo slideshow (upload/select photos, order, transition timing)
  - Music playlist (local files or links) to play alongside the slideshow
  - Overlay widgets: clock, today's tasks, upcoming calendar events, low-stock alerts
  - Runs as a dedicated "kiosk" route, e.g. `/screensaver/:householdId`, opened in a browser
    in full-screen mode on the smart screen
- **Routine tasks / chores** — recurring or one-off tasks, assignable to household members
- **Shopping lists / posts** — simple checklist-style lists, possibly multiple lists
  (groceries, hardware store, etc.)
- **Medical supply tracker** — track medication/supplies with quantity + expiry date, flag
  items expiring soon or already expired
- **Calendar** — shared household calendar for events (maybe: color-coded per member)

### Nice-to-haves (stretch goals, not required for MVP)

- Push notifications for expiring medication / due tasks
- Per-member avatars/colors shown on the screensaver
- Drag-and-drop photo/playlist ordering
- Dark mode

## Subject 1 — Cross-Platform Development (React Native)

- **Tooling**: Expo (TypeScript template) — single codebase for iOS, Android, Web
- **Requirements**:
  - Responsive layouts that work on phone, tablet, and browser window sizes
  - Navigation: tab/stack navigation for the input app; a separate unauthenticated
    full-screen route for the screensaver kiosk view
  - JWT auth flow: login/register screens, token stored client-side, attached to API calls,
    refreshed automatically, cleared on logout
  - Platform-aware code where needed (e.g. `Platform.OS`, `expo-av` for music playback,
    file/image picker differences between web and native)
  - State management for shared data (auth session, household data) — Context API to start,
    can upgrade to Zustand/Redux if it grows
- **Deployment target**: built for web (`expo export:web` / `expo router` web build) and
  deployed to a website/host; also runnable as an Expo Go / native build for demo purposes

## Subject 2 — Java Backend Programming (Spring Boot)

- **Requirements**:
  - REST API backing every feature above (auth, households, tasks, shopping lists, supplies,
    calendar, screensaver media)
  - Spring Security + JWT (access token + refresh token) for authentication/authorization
  - Persistence via Spring Data JPA (Postgres in prod/docker, H2 acceptable for early local dev)
  - Layered structure: controller → service → repository → entity/DTO
  - Validation (Bean Validation) and sensible error responses (consistent error DTO, correct
    HTTP status codes)
  - File/image upload handling for screensaver photos (store on disk/volume or object storage;
    for school scope, a mounted volume is fine)
  - API documentation (springdoc-openapi / Swagger UI) so the RN app has a clear contract
- **Suggested domain model**: `User`, `Household`, `Task`, `ShoppingList` + `ShoppingListItem`,
  `Supply` (name, quantity, expiryDate), `CalendarEvent`, `MediaItem` (photo/playlist entry)

## Subject 3 — DevOps (Docker)

- **Requirements**:
  - Dockerfile for the Spring Boot backend (multi-stage build: Maven/Gradle build stage →
    slim JRE runtime stage)
  - Dockerfile for the frontend web build (static export served via nginx, or a small Node
    server) — this is what the deployed website runs
  - `docker-compose.yml` wiring: frontend container, backend container, Postgres container,
    shared network, named volume for uploaded media + db data
  - Environment-based config (DB credentials, JWT secret, API base URL) via `.env` /
    compose env vars — never hardcoded
  - Stretch: basic CI (GitHub Actions) to build images on push; reverse proxy (nginx/Traefik)
    in front of frontend+backend if deploying both under one domain

## Architecture decisions log

| Decision | Choice | Why |
|---|---|---|
| RN framework | Expo (TS) | Only realistic path to iOS + Android + Web from one codebase |
| Token storage | AsyncStorage | Works on native *and* web; SecureStore is native-only |
| Auth pattern | JWT access + refresh token | Standard, works for a web-deployed SPA-like app |
| Backend framework | Spring Boot + Spring Security | Required by the Java backend subject |
| DB | Postgres (docker), H2 for quick local dev | Realistic for prod, zero-setup for early dev |
| Containerization | docker-compose, multi-stage Dockerfiles | Required by the DevOps subject |

## Open questions / decide later

- Exact hosting target for the deployed website (school server? free tier host? Howest infra?)
- Whether photos/playlists are uploaded to the backend or just linked (storage cost/complexity)
- Whether to use Expo Router (file-based routing, nice for web URLs like `/screensaver/:id`)
  or classic React Navigation
- How strict household/multi-tenant scoping needs to be for the assignment vs. a single
  demo household

## Repo layout

```
house-hub/
├── docs/
│   └── IDEAS.md          (this file)
├── frontend/             (Expo RN app — iOS/Android/Web)
├── backend/              (Spring Boot API)
└── docker/               (Dockerfiles, docker-compose.yml)
```
