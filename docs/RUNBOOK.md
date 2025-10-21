# M1 Runbook (Kitloop)

## 1. STG bootstrap
1. Vytvoř Supabase projekt (auth + DB) a zapiš `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` do `.env.staging` / Netlify env.
2. Netlify: přidej build env `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN` (test DSN), `STRIPE_PUBLIC_KEY`.
3. Supabase CLI: `supabase db push` + `supabase functions deploy reserve_gear create_payment_intent confirm_reservation stripe_webhook cleanup_reservation_holds`.
4. Stripe test mode: vytvoř webhook endpoint `https://<netlify-site>/.netlify/functions/stripe_webhook`, zkopíruj `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` do Supabase Edge env (`supabase secrets set`).
5. Ověř FE (`npm run build && npm run preview`) proti Supabase STG (přes `.env.local`).

## 2. Scheduler (cleanup holds)
- Supabase Dashboard → Functions → Scheduled → New schedule.
- HTTP target: `/functions/v1/cleanup_reservation_holds`.
- Cron: `*/5 * * * *` (každých 5 minut), auth: auto (service role).
- Sleduj logy: `supabase functions logs cleanup_reservation_holds` – výstup `{ "deleted_count": n }`.

## 3. Stripe Webhook
1. Stripe CLI: `stripe listen --events payment_intent.succeeded,payment_intent.payment_failed --forward-to https://<local-tunnel>/stripe_webhook`.
2. Lokální tunel (např. `npx netlify dev`) → export `STRIPE_WEBHOOK_SECRET` do `.env`.
3. Test: `stripe payment_intents create --amount 1000 --currency czk --metadata[reservation_id]=<uuid> --metadata[provider_id]=<uuid>` + `stripe payment_intents confirm <pi_id>`.
4. Sleduj Edge logy: hledat `stripe_webhook.decision` JSON.
5. Replay: `stripe trigger payment_intent.succeeded --id <pi_id>` → očekávej 200 a log `decision=replay`.

## 4. Incident – webhook replay / late event
- Replay (duplicity): kontroluj tabulku `stripe_webhook_events`. Pokud status = replay → žádná akce nutná.
- Late confirm s expirovaným holdem:
  - Pokud `decision=confirmed`, vše v pořádku.
  - Pokud `decision=cancelled_conflict` (HTTP 409), manuálně kontaktuj poskytovatele, případně vytvoř novou rezervaci.
- Potřebuješ refund? Viz NEXT: implementovat refund flow (zatím manuálně ve Stripe).

## 5. Migrace a rollback
1. Každá migrace je idempotentní – rollback řeš přes `supabase migration revert <timestamp>` (použij CLI v STG, NE na produkci bez zálohy).
2. Před revertem: snapshot DB (`pg_dump --schema=public`).
3. Po revertu: spusť `supabase db push` a ověř RLS/policies.
4. Edge funkce: `supabase functions deploy <name>` je bezpečný (versioned). V případě incidentu vrať předchozí artefakt (`supabase functions deploy <name> --import map.json`).
