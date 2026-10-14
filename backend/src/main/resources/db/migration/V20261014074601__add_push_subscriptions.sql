-- Web Push subscriptions: opt-in, per-device (a push subscription is inherently tied to
-- one specific browser/device, not a user account as a whole), with the two notification
-- toggles living on the subscription row itself so enabling/disabling on one device never
-- affects another device's subscription.

create table push_subscriptions (
    id uuid not null,
    user_id uuid not null,
    endpoint varchar(2000) not null,
    p256dh varchar(255) not null,
    auth varchar(255) not null,
    notify_on_version boolean not null default false,
    notify_on_chat_message boolean not null default false,
    created_at timestamp(6) with time zone not null,
    primary key (id),
    constraint fk_push_subscriptions_user foreign key (user_id) references users (id)
);

-- A push endpoint URL is unique per browser subscription - re-subscribing the same device
-- (e.g. after the service worker resets its subscription) upserts rather than duplicating.
create unique index uk_push_subscriptions_endpoint on push_subscriptions (endpoint);

create index idx_push_subscriptions_notify_on_version on push_subscriptions (notify_on_version);
create index idx_push_subscriptions_user_notify_on_chat on push_subscriptions (user_id, notify_on_chat_message);
