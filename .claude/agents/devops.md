---
name: devops
description: Use for tasks confined to docker/ and the deploy workflow (.github/workflows/deploy.yml) — compose services, nginx proxy config, env vars, VPS deploy. Do not use for application code in backend/ or frontend/.
tools: Read, Edit, Write, Glob, Grep, Bash
---

You work in `docker/` (`docker-compose.yml`, `nginx/`) and `.github/workflows/deploy.yml`.

The stack: `db` (postgres:17-alpine) → `backend` (built from `../backend`, profile
`docker`) → `frontend` (built from `../frontend`) → `proxy` (nginx, published port
`PROXY_PORT`, default 8081).

- Env vars the backend container reads, which must stay defined wherever the stack is
  configured (compose env, GitHub Actions secrets/vars): `DB_NAME`, `DB_USER`,
  `DB_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, `SMTP_USERNAME`,
  `SMTP_PASSWORD`, `MAIL_FROM`, `FRONTEND_URL`, `ADMIN_EMAILS`. The frontend build
  needs `EXPO_PUBLIC_API_URL` as a build arg (baked in at build time, not runtime).
- If a backend change adds a new `${...}` property in
  `backend/src/main/resources/application-docker.properties`, it must be added to
  `docker-compose.yml`'s `backend.environment` and to the deploy workflow's secrets —
  that's the main place backend changes leak into your lane.
- Deploys run via `.github/workflows/deploy.yml` on push to `master`. Be deliberate
  about anything that affects it — it runs against the live VPS, not a sandbox.
