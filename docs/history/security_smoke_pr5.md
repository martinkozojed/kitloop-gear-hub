# PR#5 Double-booking / concurrency smoke

## Inputs (set before running)
- `GEAR_ID` / `VARIANT_ID`: same bookable item
- `PROVIDER_ID`: provider owning the item
- `START_DATE`, `END_DATE`: overlapping window (ISO date or timestamp as used in API)
- Two idempotency keys for parallel requests

## Parallel hold test (expected: 1 success, 1 conflict/409)
Run two requests as the same member/owner quickly (or in two terminals):

### Request 1 (edge)
```bash
curl -X POST \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  https://<project>.functions.supabase.co/reserve_gear \
  -d '{
    "gear_id": "'"$GEAR_ID"'",
    "provider_id": "'"$PROVIDER_ID"'",
    "start_date": "'"$START_DATE"'",
    "end_date": "'"$END_DATE"'",
    "idempotency_key": "k1-'$(uuidgen)'",
    "customer": {"name": "Test"},
    "total_price": 1000,
    "deposit_paid": false
  }'
```

### Request 2 (edge, same params, different idempotency_key) almost simultaneously
```bash
curl -X POST \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  https://<project>.functions.supabase.co/reserve_gear \
  -d '{
    "gear_id": "'"$GEAR_ID"'",
    "provider_id": "'"$PROVIDER_ID"'",
    "start_date": "'"$START_DATE"'",
    "end_date": "'"$END_DATE"'",
    "idempotency_key": "k2-'$(uuidgen)'",
    "customer": {"name": "Test2"},
    "total_price": 1000,
    "deposit_paid": false
  }'
```

### Expected result
- One response: `201` with reservation_id/status hold.
- Other response: `409` (error message: insufficient_quantity or overlap), triggered by DB exclusion constraint.

## DB constraint verification (SQL)
```sql
SELECT conname, consrc, contype
FROM pg_constraint
WHERE conname in ('reservations_no_overlap_variant','reservations_no_overlap_gear');
-- Expect: two EXCLUDE constraints with daterange and status filter (hold/confirmed/active), one for product_variant_id, one for gear_id
```

## Client path verification
Ensure `createReservationHold` uses edge only (no direct INSERT):
- Check `src/services/reservations.ts` for `invokeEdgeReserveGear` call path; direct insert removed.

## Mapping 409 in edge
If edge returns PG exclusion violation, client should surface user-friendly message:
- Confirm edge error handling returns 409/overlap on constraint failure.
