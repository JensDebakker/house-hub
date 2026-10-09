-- Baseline schema matching entities as of the Flyway migration. Enum-backed columns
-- (role, type) are stored as varchar rather than a native enum type, since Postgres
-- has no built-in enum compatible with H2's ENUM syntax and Hibernate maps
-- @Enumerated(STRING) to a plain character column on both dialects anyway.

create table households (
    id uuid not null,
    name varchar(255) not null,
    invite_code varchar(8) not null,
    created_at timestamp(6) with time zone not null,
    storage_limit_bytes bigint not null default 4294967296,
    primary key (id),
    constraint uk_households_invite_code unique (invite_code)
);

create table users (
    id uuid not null,
    email varchar(255) not null,
    password_hash varchar(255) not null,
    display_name varchar(255) not null,
    role varchar(255) not null,
    email_verified boolean not null,
    created_at timestamp(6) with time zone not null,
    primary key (id),
    constraint uk_users_email unique (email)
);

create table household_memberships (
    id uuid not null,
    user_id uuid not null,
    household_id uuid not null,
    role varchar(255) not null,
    joined_at timestamp(6) with time zone not null,
    primary key (id),
    constraint uk_household_memberships_user_household unique (user_id, household_id),
    constraint fk_household_memberships_user foreign key (user_id) references users (id),
    constraint fk_household_memberships_household foreign key (household_id) references households (id)
);

create table tasks (
    id uuid not null,
    title varchar(255) not null,
    done boolean not null,
    due_date date,
    assigned_to uuid,
    household_id uuid not null,
    primary key (id),
    constraint fk_tasks_assigned_to foreign key (assigned_to) references users (id),
    constraint fk_tasks_household foreign key (household_id) references households (id)
);

create table shopping_lists (
    id uuid not null,
    name varchar(255) not null,
    household_id uuid not null,
    primary key (id),
    constraint fk_shopping_lists_household foreign key (household_id) references households (id)
);

create table shopping_list_items (
    id uuid not null,
    label varchar(255) not null,
    checked boolean not null,
    shopping_list_id uuid not null,
    primary key (id),
    constraint fk_shopping_list_items_shopping_list foreign key (shopping_list_id) references shopping_lists (id)
);

create table supplies (
    id uuid not null,
    name varchar(255) not null,
    quantity integer not null,
    expiry_date date not null,
    household_id uuid not null,
    primary key (id),
    constraint fk_supplies_household foreign key (household_id) references households (id)
);

create table calendar_events (
    id uuid not null,
    title varchar(255) not null,
    start_at timestamp(6) with time zone not null,
    end_at timestamp(6) with time zone,
    household_id uuid not null,
    primary key (id),
    constraint fk_calendar_events_household foreign key (household_id) references households (id)
);

create table house_files (
    id uuid not null,
    household_id uuid not null,
    uploaded_by uuid,
    filename varchar(255) not null,
    content_type varchar(255) not null,
    size_bytes bigint not null,
    storage_key varchar(255) not null,
    uploaded_at timestamp(6) with time zone not null,
    primary key (id),
    constraint uk_house_files_storage_key unique (storage_key),
    constraint fk_house_files_household foreign key (household_id) references households (id),
    constraint fk_house_files_uploaded_by foreign key (uploaded_by) references users (id)
);

create table verification_tokens (
    id uuid not null,
    token varchar(255) not null,
    type varchar(255) not null,
    user_id uuid not null,
    expires_at timestamp(6) with time zone not null,
    used boolean not null,
    primary key (id),
    constraint uk_verification_tokens_token unique (token),
    constraint fk_verification_tokens_user foreign key (user_id) references users (id)
);
