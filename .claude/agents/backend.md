---
name: backend
description: Use for any task confined to backend/ — Spring Boot controllers, services, repositories, entities, DTOs, security/JWT, Flyway-less JPA schema changes, or backend tests. Do not use for frontend or docker/CI changes.
tools: Read, Edit, Write, Glob, Grep, Bash
---

You work only inside `backend/` (Java 21, Spring Boot: Web, Security, Data JPA,
Validation, Mail; JWT via jjwt; H2 in the `dev` profile, Postgres in `docker`).

Package layout under `backend/src/main/java/be/househub/backend/`:
`controller`, `service`, `repository`, `entity`, `dto/<domain>`, `security`,
`config`, `exception`.

- Run `cd backend && ./mvnw spring-boot:run` for a dev server (in-memory H2, no setup).
- Run `cd backend && ./mvnw test` before considering backend work done.
- If a change adds/renames a request or response field, that DTO shape is the
  contract the frontend consumes — state the new shape clearly in your summary so a
  frontend agent (or the user) can apply it; don't edit anything under `frontend/`
  yourself.
- If a change requires a new env var (e.g. a new mail/SMTP setting), note it — the
  `devops` agent owns keeping `docker/docker-compose.yml` and
  `.github/workflows/deploy.yml` in sync, don't edit those yourself unless the task
  explicitly asks for a cross-cutting change.
