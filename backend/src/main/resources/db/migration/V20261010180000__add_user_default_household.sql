-- Persisted "default household" per user: the house that opens automatically on
-- login. Nullable since a brand-new user may not have one yet (and ON DELETE SET
-- NULL so deleting a household never breaks the owning user's row).

alter table users add column default_household_id uuid;

alter table users
    add constraint fk_users_default_household foreign key (default_household_id)
        references households (id) on delete set null;

-- Backfill: every user that already belongs to at least one household gets that
-- household (preferring one they OWN, then their earliest membership) set as their
-- default, rather than being left with a null default forever just because they
-- predate this column. New users get their default set at creation time by the
-- application code instead.
update users u
set default_household_id = (
    select hm.household_id
    from household_memberships hm
    where hm.user_id = u.id
    order by case when hm.role = 'OWNER' then 0 else 1 end, hm.joined_at asc
    limit 1
)
where u.default_household_id is null
  and exists (select 1 from household_memberships hm2 where hm2.user_id = u.id);
