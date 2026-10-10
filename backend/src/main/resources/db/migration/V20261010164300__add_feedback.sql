-- Feedback module: users file bug reports / suggestions (optionally with image
-- attachments stored via FileStorageService, not in the DB); admins triage across
-- all users.

create table feedback_tickets (
    id uuid not null,
    user_id uuid not null,
    type varchar(255) not null,
    description varchar(2000) not null,
    status varchar(255) not null,
    created_at timestamp(6) with time zone not null,
    updated_at timestamp(6) with time zone not null,
    primary key (id),
    constraint fk_feedback_tickets_user foreign key (user_id) references users (id)
);

create index idx_feedback_tickets_user_created_at on feedback_tickets (user_id, created_at);

create table feedback_attachments (
    id uuid not null,
    ticket_id uuid not null,
    storage_key varchar(255) not null,
    content_type varchar(255) not null,
    original_filename varchar(255) not null,
    created_at timestamp(6) with time zone not null,
    primary key (id),
    constraint uk_feedback_attachments_storage_key unique (storage_key),
    constraint fk_feedback_attachments_ticket foreign key (ticket_id) references feedback_tickets (id)
);

create index idx_feedback_attachments_ticket on feedback_attachments (ticket_id);
