## Proof of idempotence

Use the same `external_key_base` (or run_id) you passed to `seed_preflight`. Replace `:base` below (psql `\set base 'preflight_123'`).

```sql
-- Assets count for this seed
SELECT count(*) AS assets_for_seed
FROM public.assets
WHERE external_key LIKE :'base' || '%';

-- Reservations count for this seed
SELECT count(*) AS reservations_for_seed
FROM public.reservations
WHERE external_key LIKE :'base' || '%';

-- Membership exists exactly once
SELECT count(*) AS membership_rows
FROM public.user_provider_memberships
WHERE external_key = :'base' || '_membership';

-- No duplicate external keys for this seed
SELECT external_key, count(*)
FROM public.products
WHERE external_key LIKE :'base' || '%'
GROUP BY external_key
HAVING count(*) > 1;

SELECT external_key, count(*)
FROM public.product_variants
WHERE external_key LIKE :'base' || '%'
GROUP BY external_key
HAVING count(*) > 1;

SELECT external_key, count(*)
FROM public.assets
WHERE external_key LIKE :'base' || '%'
GROUP BY external_key
HAVING count(*) > 1;

SELECT external_key, count(*)
FROM public.reservations
WHERE external_key LIKE :'base' || '%'
GROUP BY external_key
HAVING count(*) > 1;

-- Global uniqueness guard (should always return zero rows)
SELECT 'providers' AS table, external_key, count(*)
FROM public.providers
WHERE external_key IS NOT NULL
GROUP BY table, external_key
HAVING count(*) > 1
UNION ALL
SELECT 'user_provider_memberships', external_key, count(*)
FROM public.user_provider_memberships
WHERE external_key IS NOT NULL
GROUP BY table, external_key
HAVING count(*) > 1
UNION ALL
SELECT 'products', external_key, count(*)
FROM public.products
WHERE external_key IS NOT NULL
GROUP BY table, external_key
HAVING count(*) > 1
UNION ALL
SELECT 'product_variants', external_key, count(*)
FROM public.product_variants
WHERE external_key IS NOT NULL
GROUP BY table, external_key
HAVING count(*) > 1
UNION ALL
SELECT 'assets', external_key, count(*)
FROM public.assets
WHERE external_key IS NOT NULL
GROUP BY table, external_key
HAVING count(*) > 1
UNION ALL
SELECT 'reservations', external_key, count(*)
FROM public.reservations
WHERE external_key IS NOT NULL
GROUP BY table, external_key
HAVING count(*) > 1;
```

## Expected outputs
- Counts for assets/reservations stay constant across repeated runs with the same `external_key_base` (typically 3 assets, 1 reservation unless overridden).
- Membership row exists exactly once for the given base; no duplicate external_key rows in any table.
- `external_key_base` automatically includes a sanitized provider email suffix to avoid collisions across providers.

## Common failures
- Missing unique indexes (rerun migrations or check `\d` output for each table).
- Using the same `external_key_base` for a different provider email will upsert into the same provider/membership; include a new base per provider to isolate data.
- RLS errors: calls must be via e2e_harness with service-role token (E2E_SUPABASE_URL + E2E_SEED_TOKEN).

## Deterministic upserts reference
- providers: onConflict `external_key` (index `providers_external_key_key`) — key uses base + provider email slug.
- user_provider_memberships: onConflict `external_key` (index `user_provider_memberships_external_key_key`) — key uses same base + provider email slug.
- products: onConflict `(provider_id, external_key)` (index `products_external_key_provider_key`) — external_key derived from the provider base.
- product_variants: onConflict `(product_id, external_key)` (index `product_variants_external_key_product_key`) — external_key derived from the provider base.
- assets: onConflict `(provider_id, external_key)` (index `assets_external_key_provider_key`) — external_key derived from the provider base.
- reservations: onConflict `(provider_id, external_key)` (index `reservations_external_key_provider_key`) — external_key derived from the provider base.
