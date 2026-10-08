# Docker / DevOps

Planned for the DevOps subject. See [../docs/IDEAS.md](../docs/IDEAS.md) for requirements.

Four services, one network:
- `db` — Postgres, named volume for data
- `backend` — Spring Boot, built from [../backend/Dockerfile](../backend/Dockerfile)
- `frontend` — the Expo web export, built from [../frontend/Dockerfile](../frontend/Dockerfile)
  and served as static files via nginx
- `proxy` — a small nginx container that does path-based routing: `/api/*` → `backend`,
  everything else → `frontend`. This is the only container that publishes a port to the host.

```
jensdebakker.com  ──(host nginx, TLS)──>  127.0.0.1:${PROXY_PORT}  ──>  proxy  ──┬─> /api/*  → backend:8080
                                                                                  └─> /*      → frontend:80
```

## Running locally

```bash
cd docker
cp .env.example .env     # defaults are fine for a local try-out
docker compose up --build
```

- Site: http://localhost:8081
- API: http://localhost:8081/api (Swagger UI at /api/swagger-ui.html)

`EXPO_PUBLIC_API_URL` is baked into the frontend's static JS **at image build time** (it runs
in the browser, so it must always be the public URL — see the note in
[../frontend/Dockerfile](../frontend/Dockerfile)). If you change it, you must rebuild the
`frontend` image, not just restart the container.

## Deploying to jensdebakker.com (Hetzner VPS, existing nginx)

The VPS already runs nginx with TLS for jensdebakker.com, currently fronting an unrelated
Angular/Node app. Those can stay stopped for this project — Docker Compose owns everything
*except* the host's nginx + TLS certs, which stay as they are.

1. Stop the old Angular/Node services (whatever currently listens on the port the existing
   nginx proxies to).
2. Clone this repo onto the server, `cd docker`.
3. `cp .env.example .env` and fill in real values:
   - `DB_PASSWORD` — a real password
   - `JWT_SECRET` — a long random string (e.g. `openssl rand -base64 48`)
   - `CORS_ALLOWED_ORIGINS=https://jensdebakker.com`
   - `EXPO_PUBLIC_API_URL=https://jensdebakker.com/api`
   - `PROXY_PORT` — a free local port for the host nginx to proxy to, e.g. `8081`
4. `docker compose up -d --build`
5. Point the host nginx's existing `server { server_name jensdebakker.com; ... }` block (the
   one with the TLS cert) at the compose stack instead of the old app:
   ```nginx
   location / {
       proxy_pass http://127.0.0.1:8081;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```
   Then `sudo nginx -t && sudo systemctl reload nginx`. TLS certs are untouched — the host
   nginx still terminates HTTPS for jensdebakker.com, it just forwards plain HTTP to the
   compose stack's `proxy` container now.
6. `docker compose logs -f` to confirm all four containers are healthy, then verify
   `https://jensdebakker.com/api/v3/api-docs` and `https://jensdebakker.com/` both load.

To redeploy after a code change: `git pull && docker compose up -d --build`.

## Native apps (iOS/Android)

They also call `https://jensdebakker.com/api` — same `EXPO_PUBLIC_API_URL`, baked in at
build time via `eas build` or `expo run:*` with that env var set. There's no "local machine"
shortcut for them either: a phone isn't on the same network as the server by default, so it
always needs the public URL, same as the web build.
