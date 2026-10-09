-- invite_code was added to the Household entity (self-service households) while the
-- households table already had rows in production. Hibernate's old ddl-auto=update
-- can't add a NOT NULL column with no default to a populated table, so it silently never
-- applied it there (dev's H2 is empty on every run, so V1__baseline.sql's own copy of the
-- column already covers dev - this migration is a no-op there, and only backfills prod).
-- Written to be idempotent on both dialects since dev already has everything it adds.

alter table households add column if not exists invite_code varchar(8);

update households
set invite_code = upper(substring(replace(cast(id as varchar), '-', '') from 1 for 8))
where invite_code is null;

alter table households alter column invite_code set not null;

create unique index if not exists uk_households_invite_code on households (invite_code);
