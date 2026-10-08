# Entity-Relationship Diagram

Every JPA entity in `backend/src/main/java/be/househub/backend/entity`, as of the
multi-household-membership + house-files changes. Renders natively on GitHub and in VS
Code's Markdown preview (Mermaid).

```mermaid
erDiagram
    USER {
        uuid id PK
        string email
        string password_hash
        string display_name
        string role "enum: ADMIN, USER, GUEST"
        boolean email_verified
        timestamp created_at
    }

    HOUSEHOLD {
        uuid id PK
        string name
        string invite_code "unique, 8 chars"
        bigint storage_limit_bytes "default 4GB"
        timestamp created_at
    }

    HOUSEHOLD_MEMBERSHIP {
        uuid id PK
        uuid user_id FK
        uuid household_id FK
        string role "enum: OWNER, MEMBER"
        timestamp joined_at
    }

    TASK {
        uuid id PK
        string title
        boolean done
        date due_date
        uuid assigned_to FK "nullable, -> USER"
        uuid household_id FK
    }

    SUPPLY {
        uuid id PK
        string name
        int quantity
        date expiry_date
        uuid household_id FK
    }

    SHOPPING_LIST {
        uuid id PK
        string name
        uuid household_id FK
    }

    SHOPPING_LIST_ITEM {
        uuid id PK
        string label
        boolean checked
        uuid shopping_list_id FK
    }

    CALENDAR_EVENT {
        uuid id PK
        string title
        timestamp start_at
        timestamp end_at "nullable"
        uuid household_id FK
    }

    VERIFICATION_TOKEN {
        uuid id PK
        string token "unique"
        string type "enum: EMAIL_VERIFY, PASSWORD_RESET"
        uuid user_id FK
        timestamp expires_at
        boolean used
    }

    HOUSE_FILE {
        uuid id PK
        uuid household_id FK
        uuid uploaded_by FK "nullable, -> USER"
        string filename
        string content_type
        bigint size_bytes
        string storage_key "unique"
        timestamp uploaded_at
    }

    USER ||--o{ HOUSEHOLD_MEMBERSHIP : "has"
    HOUSEHOLD ||--o{ HOUSEHOLD_MEMBERSHIP : "has"
    HOUSEHOLD ||--o{ TASK : "has"
    USER ||--o{ TASK : "assigned (optional)"
    HOUSEHOLD ||--o{ SUPPLY : "has"
    HOUSEHOLD ||--o{ SHOPPING_LIST : "has"
    SHOPPING_LIST ||--o{ SHOPPING_LIST_ITEM : "has"
    HOUSEHOLD ||--o{ CALENDAR_EVENT : "has"
    USER ||--o{ VERIFICATION_TOKEN : "owns"
    HOUSEHOLD ||--o{ HOUSE_FILE : "stores"
    USER ||--o{ HOUSE_FILE : "uploaded (optional)"
```

## Notes

- **`HOUSEHOLD_MEMBERSHIP`** is the User↔Household join, but it carries its own attribute
  (`role`: OWNER/MEMBER per membership) so it's modeled as a first-class entity rather than
  a plain `@ManyToMany` join table — a user can belong to any number of households, each
  with its own role, and `(user_id, household_id)` is unique.
- **`TASK.assigned_to`** and **`HOUSE_FILE.uploaded_by`** are the only nullable FKs to
  `USER` — a task can be unassigned, and a file's uploader can go unset (e.g. if the
  uploading user is later removed without cascading the file).
- All other domain tables (`TASK`, `SUPPLY`, `SHOPPING_LIST`, `CALENDAR_EVENT`,
  `HOUSE_FILE`) hang directly off `HOUSEHOLD`, each in its own table — that separation
  (e.g. files vs. tasks) already falls out of normal entity-per-table modeling; there was
  never a shared "everything" table to split apart.
- `VERIFICATION_TOKEN` belongs to `USER` only (email verification / password reset), not
  to a household.
- Schema is created via Hibernate `ddl-auto=update` (no Flyway/Liquibase in this project) —
  see `backend/src/main/resources/application-{dev,docker}.properties`.
