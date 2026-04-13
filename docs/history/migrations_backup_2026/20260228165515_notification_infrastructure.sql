-- Notification Infrastructure MVP
-- Creates Preferences, Outbox, and Deliveries tables
-- 1) Uživatelské preference (per user, per provider)
create table if not exists public.notification_preferences (
    id uuid primary key default gen_random_uuid(),
    provider_id uuid not null references public.providers(id) on delete cascade,
    user_id uuid not null references public.profiles(user_id) on delete cascade,
    email_enabled boolean not null default true,
    inapp_enabled boolean not null default true,
    webpush_enabled boolean not null default false,
    -- granularita
    ops_daily_digest boolean not null default true,
    ops_realtime boolean not null default true,
    edu_digest boolean not null default false,
    -- quiet hours (lokální čas pobočky / uživatele)
    quiet_hours_start time,
    quiet_hours_end time,
    timezone text not null default 'Europe/Prague',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(provider_id, user_id)
);
-- RLS pro preference
alter table public.notification_preferences enable row level security;
create policy "Users can view their own preferences" on public.notification_preferences for
select using (auth.uid() = user_id);
create policy "Users can update their own preferences" on public.notification_preferences for
update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can insert their own preferences" on public.notification_preferences for
insert with check (auth.uid() = user_id);
-- Trigger pro 'updated_at'
create trigger handle_notification_preferences_updated_at before
update on public.notification_preferences for each row execute function extensions.moddatetime (updated_at);
-- 2) Outbox = co se má poslat (kanál nezávisle)
create table if not exists public.notification_outbox (
    id uuid primary key default gen_random_uuid(),
    provider_id uuid not null references public.providers(id) on delete cascade,
    user_id uuid not null references public.profiles(user_id) on delete cascade,
    kind text not null,
    -- 'ops.overdue', 'ops.pickup_tomorrow', 'auth.invite', ...
    channel text not null,
    -- 'inapp' | 'email' | 'webpush'
    priority int not null default 5,
    -- 1=kritické, 10=nízké
    idempotency_key text not null,
    -- dedupe
    payload jsonb not null default '{}'::jsonb,
    status text not null default 'pending',
    -- pending|processing|sent|failed|canceled
    attempt_count int not null default 0,
    next_attempt_at timestamptz not null default now(),
    last_error text,
    created_at timestamptz not null default now(),
    sent_at timestamptz
);
create unique index if not exists notification_outbox_dedupe on public.notification_outbox (provider_id, user_id, channel, idempotency_key);
create index if not exists notification_outbox_pending on public.notification_outbox (status, next_attempt_at);
-- RLS pro outbox
-- (Only the backend / edge function should process outbox records, but let's allow users to see their own pending/sent things if needed for the UI inbox, though typically the UI inbox is a separate read model. Let's provide basic read access.)
alter table public.notification_outbox enable row level security;
create policy "Users can view their own outbox entries" on public.notification_outbox for
select using (auth.uid() = user_id);
-- Providers might need to insert notification events via RPC/Service Role, so we don't necessarily need insert policies for users directly.
-- 3) Delivery log = co se reálně doručilo (audit)
create table if not exists public.notification_deliveries (
    id uuid primary key default gen_random_uuid(),
    outbox_id uuid not null references public.notification_outbox(id) on delete cascade,
    provider_id uuid not null references public.providers(id) on delete cascade,
    user_id uuid not null references public.profiles(user_id) on delete cascade,
    channel text not null,
    external_id text,
    -- message id od email providera
    delivered_at timestamptz,
    opened_at timestamptz,
    clicked_at timestamptz,
    bounced_at timestamptz,
    meta jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);
-- RLS pro deliveries
alter table public.notification_deliveries enable row level security;
create policy "Users can view their own deliveries" on public.notification_deliveries for
select using (auth.uid() = user_id);