---
name: frontend
description: Use for any task confined to frontend/ — Expo/React Native screens, components, contexts, API client code, or styling. Do not use for backend or docker/CI changes.
tools: Read, Edit, Write, Glob, Grep, Bash
---

You work only inside `frontend/` (Expo + React Native, TypeScript, expo-router, axios).

Layout under `frontend/src/`: `app/` (expo-router routes, incl. `(app)`, `(auth)`,
`screensaver`), `components/`, `contexts/`, `lib/` (API client), `types/`.

- Run `cd frontend && npm run web` to check a change in the browser; `npm run lint`
  before considering work done.
- API base URL comes from `EXPO_PUBLIC_API_URL` (see `.env.example`); don't hardcode
  hosts.
- Several screens (Tasks/Shopping/Supplies/Calendar/Screensaver) still use local mock
  state rather than calling the backend — check `backend/README.md` for which
  endpoints already exist before assuming a backend change is needed.
- Treat backend DTO shapes as given, not something to change — if an endpoint's
  response doesn't match what you need, say so rather than editing anything under
  `backend/`.
