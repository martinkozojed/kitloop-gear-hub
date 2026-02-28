-- Notification generators
-- 1. Funkce pro generování upozornění na zpožděné položky (Overdue)
-- Spouští se ideálně každých 15 minut nebo hodinově pomocí cronu.
create or replace function public.generate_overdue_notifications() returns void as $$
declare res record;
idem_key text;
begin -- Najdeme všechny aktivní rezervace, které měly být vráceny včera (nebo dříve) a ještě nebyly
-- Pro jednoduchost MVP bereme ty, které mají end_date v minulosti a status active
for res in
select r.id,
    r.provider_id,
    pr.user_id,
    r.end_date
from public.reservations r
    join public.providers p on p.id = r.provider_id
    join public.profiles pr on pr.user_id = p.user_id
where r.status = 'active'
    and r.end_date < current_date loop -- Idempotency key fixovaný na aktuální datum a ID rezervace
    -- Tím zaručíme, že se upozornění k jedné rezervaci pošle max 1x denně
    idem_key := 'overdue:' || current_date::text || ':' || res.id::text;
insert into public.notification_outbox (
        provider_id,
        user_id,
        kind,
        channel,
        priority,
        idempotency_key,
        payload
    )
values (
        res.provider_id,
        res.user_id,
        'ops.overdue_detected',
        'inapp',
        -- Začneme s inapp upozorněním v MVP
        1,
        -- Vysoká priorita
        idem_key,
        jsonb_build_object(
            'reservation_id',
            res.id,
            'end_date',
            res.end_date,
            'message',
            'Rezervace je po termínu vrácení.'
        )
    ) on conflict (provider_id, user_id, channel, idempotency_key) do nothing;
end loop;
end;
$$ language plpgsql security definer
set search_path = public;
-- 2. Funkce pro generování denního shrnutí (Daily digest) - Zítřejší výdeje
-- Spouští se ideálně 1x denně (např. večer v 18:00 nebo ráno v 6:00).
create or replace function public.generate_tomorrow_pickups_digest() returns void as $$
declare prov record;
idem_key text;
pickup_count int;
begin -- Projdeme všechny providery
for prov in
select p.id as provider_id,
    pr.user_id
from public.providers p
    join public.profiles pr on pr.user_id = p.user_id loop -- Kolik mají zítra výdejů?
select count(*) into pickup_count
from public.reservations
where provider_id = prov.provider_id
    and status in ('confirmed', 'pending')
    and start_date = current_date + interval '1 day';
if pickup_count > 0 then idem_key := 'pickups_tomorrow:' || (current_date + interval '1 day')::text;
insert into public.notification_outbox (
        provider_id,
        user_id,
        kind,
        channel,
        priority,
        idempotency_key,
        payload
    )
values (
        prov.provider_id,
        prov.user_id,
        'ops.pickups_tomorrow',
        'inapp',
        5,
        -- Normální priorita
        idem_key,
        jsonb_build_object(
            'date',
            (current_date + interval '1 day'),
            'pickup_count',
            pickup_count,
            'message',
            'Zítra vás čeká ' || pickup_count || ' výdejů.'
        )
    ) on conflict (provider_id, user_id, channel, idempotency_key) do nothing;
end if;
end loop;
end;
$$ language plpgsql security definer
set search_path = public;
-- Poznámka: Samotné spouštění přes pg_cron (cron.schedule) vyžaduje aktivní
-- pg_cron extenzi sítě a závisí na prostředí (local / prod). 
-- Proto pg_cron schedule nastavíme až specificky v deployment skriptech,
-- nebo tyto funkce může volat externí scheduler typu GitHub Actions / Netlify Cron.