-- users.household and users.household_role (direct user->household relationship,
-- NOT NULL on household_role) predate the household_memberships join table
-- introduced when that direct relationship was replaced. ddl-auto=update never
-- drops columns, so both stayed on the live table unmapped by any entity -
-- household_role being NOT NULL made every INSERT into users (i.e. every
-- registration) fail outright.
alter table users drop column if exists household_role;
alter table users drop column if exists household_id;
