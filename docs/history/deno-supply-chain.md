# Deno supply chain determinism (PR6)

- **Pinned version**: `v2.5.6` in `.deno-version` and GitHub Actions `setup-deno` (test_deno job).
- **Lock enforcement**: `deno.lock` is the single source of truth; CI runs cache/tests with `--lock=deno.lock --frozen`.
- **esm.sh rule**: every import must specify an exact package version and `?target=denonext&pin=v135` (no floating semvers, no missing pin).

## Deno surfaces (what to check)
- Edge functions: `supabase/functions/admin_action`, `reserve_gear`, `confirm_reservation`, `create_payment_intent`, `stripe_webhook`, `cleanup_reservation_holds`, `e2e_harness`, `upload_ticket`.
- Scripts: `scripts/seed_analytics.ts`.

## Remote dependency hotspots
- `https://esm.sh/@supabase/supabase-js@2.50.0?target=denonext&pin=v135` (edge functions + script).
- `https://esm.sh/@faker-js/faker@8.4.1?target=denonext&pin=v135` (analytics seed).
- `https://deno.land/x/zod@v3.23.8`, `https://deno.land/x/postgres@v0.17.1`, `https://deno.land/std@0.224.0` (validators/tests/db access).

## How to update deps
1) Be on Deno `v2.5.6` (`deno --version`).
2) Refresh the lock in a clean cache:  
   `DENO_DIR=$(mktemp -d) deno cache --lock=deno.lock --reload supabase/functions/**/*.ts scripts/**/*.ts`
3) Commit the updated `deno.lock`.

## If CI fails on lock drift
- Re-run the cache command above, commit `deno.lock`, and re-run CI.
- If esm.sh resolution changed, re-pin the import to an exact version with `?target=denonext&pin=v135` before regenerating the lock.

## Rules for esm.sh imports
- Always include an exact package version (e.g., `@supabase/supabase-js@2.50.0`).
- Always append `?target=denonext&pin=v135` for consistency across CI and local.
- Do not use floating tags or omit `pin`.

## How to run locally (frozen)
- Cache check: `deno task deno:cache` (uses `--lock=deno.lock --frozen`).
- Tests: `deno task deno:test` (uses `--lock=deno.lock --frozen`).
- Repro check with clean cache:  
  `DENO_DIR=$(mktemp -d) deno test --allow-env --allow-read --lock=deno.lock --frozen supabase/functions`
