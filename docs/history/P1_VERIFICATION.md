## P1 Verification Checklist (copy into PR)

1) Apply migrations: `supabase db push`
2) Redeploy harness: `supabase functions deploy e2e_harness` (pg_cron calls the SQL function directly; edge cleanup deploy is optional for manual runs only).
3) Deterministic seed: run `./scripts/e2e_preflight.sh <provider_email>` three times with the same params; asset/reservation counts must stay constant (see docs/e2e_preflight.md for queries).
4) Run Playwright E2E three times back-to-back (selectors are data-testid only).
5) Cron health:
   - SQL: `select cron_name, status, metadata, finished_at from cron_runs where cron_name='cleanup_reservation_holds_cron' order by started_at desc limit 5;`
   - UI: /admin/observability shows the latest `cleanup_reservation_holds_cron` run with deleted count; status updates on success/fail.

### Expected outputs
- seed_preflight returns stable IDs for provider/product/variant/assets/reservation across repeated runs with the same base (counts unchanged).
- cron_runs shows `cleanup_reservation_holds_cron` with status success and metadata.deleted_count.
- Observability UI mirrors cron_runs data and lists both cron and manual runs separately.

### Common failures
- Duplicates: ensure external_key unique indexes exist (`\d providers`, `\d products`, `\d product_variants`, `\d assets`, `\d reservations`, `\d user_provider_memberships`); rerun migrations.
- RLS 403 on harness: calls must use service role (E2E_SUPABASE_URL + E2E_SEED_TOKEN); harness rejects missing token and relies on service role.
- Flaky timestamps: seed_preflight uses ISO `now()` offsets; if overlaps occur, change `run_id`/`external_key_base` and rerun 3×.
