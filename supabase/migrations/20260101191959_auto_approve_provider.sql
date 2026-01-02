-- Auto-approve providers on creation (MVP simplification)
-- Sets default status/verified, and ensures existing pending are marked approved

alter table public.providers
    alter column status set default 'approved';

alter table public.providers
    alter column verified set default true;

-- Backfill existing rows that are pending/unverified
update public.providers
set status = 'approved', verified = true
where status is null or status <> 'approved' or verified = false;
