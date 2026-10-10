-- Persisted "default household" per user: the house that opens automatically on
-- login. Nullable since a brand-new user may not have one yet (and ON DELETE SET
-- NULL so deleting a household never breaks the owning user's row).

alter table users add column default_household_id uuid;

alter table users
    add constraint fk_users_default_household foreign key (default_household_id)
        references households (id) on delete set null;
