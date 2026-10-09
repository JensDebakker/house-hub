-- Persists messages relayed over the "chat" websocket channel so they survive
-- reconnects and can be paged through via GET /households/{householdId}/chat-messages.

create table chat_messages (
    id uuid not null,
    household_id uuid not null,
    sender_id uuid not null,
    text varchar(2000) not null,
    created_at timestamp(6) with time zone not null,
    primary key (id),
    constraint fk_chat_messages_household foreign key (household_id) references households (id),
    constraint fk_chat_messages_sender foreign key (sender_id) references users (id)
);

create index idx_chat_messages_household_created_at on chat_messages (household_id, created_at);
