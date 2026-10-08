# House Hub

Household management tool + smart-screen screensaver, built across three Howest subjects.
Full requirements and design decisions: [docs/IDEAS.md](docs/IDEAS.md).

| Folder | Subject | Status |
|---|---|---|
| [frontend/](frontend/) | Cross-Platform Development | scaffolded — auth, tabs, screensaver route |
| [backend/](backend/) | Java Backend Programming | not started |
| [docker/](docker/) | DevOps | not started |

## Running the frontend

```bash
cd frontend
npm install
cp .env.example .env   # set EXPO_PUBLIC_API_URL once the backend exists
npm run web             # or: npm run android / npm run ios
```

Until the backend exists, auth calls (`/auth/login`, `/auth/register`, `/auth/me`,
`/auth/refresh`) will fail — the Dashboard/Tasks/Shopping/Supplies/Calendar/Screensaver
screens themselves work standalone with local state so the UI can be demoed already.
