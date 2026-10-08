# Backend (Spring Boot) — not started yet

Planned for the Java Backend Programming subject. See [../docs/IDEAS.md](../docs/IDEAS.md)
for the full requirements and domain model.

Next steps when we get here:
- `spring init` with Web, Security, Data JPA, Validation, PostgreSQL driver
- `User` / `Household` / `Task` / `ShoppingList` / `Supply` / `CalendarEvent` entities
- JWT auth (access + refresh token) matching the endpoints the frontend already calls:
  `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`
- springdoc-openapi for a Swagger UI contract
