# Frontend (Expo / React Native)

Household management UI + smart-screen screensaver. See [../docs/IDEAS.md](../docs/IDEAS.md)
for the full requirements.

Stack: Expo / React Native (TypeScript) · expo-router · axios · `@tanstack/react-query`.

## Running locally

```bash
cd frontend
npm install
npm run web          # or: npm run android / npm run ios
```

- API base URL comes from `EXPO_PUBLIC_API_URL` (see `.env.example`) — points at the backend's
  `http://localhost:8080/api` by default.
- Layout under `src/`: `app/` (expo-router routes, incl. `(app)`, `(auth)`, `screensaver`),
  `components/`, `contexts/`, `lib/` (API client), `types/`.

## Testing

### Type checking & lint

```bash
npm run lint
```

### Visual / E2E testing (Playwright)

The web build is driven with [Playwright](https://playwright.dev) so UI and animation
changes can be checked against a real rendered browser instead of just reading the code.

```bash
npx playwright install chromium   # first time only, downloads the browser binary
npm run test:e2e                  # headless run against the Expo web dev server
npm run test:e2e:ui               # interactive runner — watch the browser, step through
npm run test:e2e:update-snapshots # re-baseline screenshots after an intentional UI change
```

`playwright.config.ts` boots `npm run web` itself (`http://localhost:8081`) before running
tests, so no separate dev server needs to be running first — though if one is already up,
the config reuses it instead of starting a second one.

Specs live in `e2e/*.spec.ts`; the pattern is `page.goto('/some-route')` then assertions plus
`expect(page).toHaveScreenshot('name.png')` for a visual baseline (see `e2e/login.spec.ts`).
Baseline screenshots are committed under `e2e/*.spec.ts-snapshots/` — review the diff when a
snapshot changes to confirm it's the UI change you intended, not a regression.
