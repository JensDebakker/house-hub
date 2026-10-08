# Docker / DevOps — not started yet

Planned for the DevOps subject. See [../docs/IDEAS.md](../docs/IDEAS.md) for requirements.

Next steps when the backend exists:
- Multi-stage `Dockerfile` for `backend/` (build stage → slim JRE runtime)
- `Dockerfile` for `frontend/` web export (served via nginx)
- `docker-compose.yml`: frontend + backend + Postgres, shared network, named volumes for
  uploaded media and db data, config via `.env`
