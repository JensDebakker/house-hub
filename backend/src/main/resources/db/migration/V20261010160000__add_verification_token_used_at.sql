alter table verification_tokens
    add column used_at timestamp(6) with time zone;
