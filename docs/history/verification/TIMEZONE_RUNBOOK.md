# Pilot Runbook — Timezone Behavior

## Current Behavior (F1 Pilot)

The "Today List" dashboard triage determines "today" using the **provider's configured timezone** (`providers.time_zone`, IANA format, default: `Europe/Prague`).

### How it works

1. `getProviderTodayDates(provider.time_zone)` computes `todayDate` and `tomorrowDate` as `YYYY-MM-DD` strings in the provider's timezone.
2. These strings are used directly in Supabase queries against `reservations.start_date` and `reservations.end_date` (Postgres `DATE` columns).
3. **No `toISOString()`** — DATE columns don't need timestamps, so there's no UTC shift.

### Fallback

If `provider.time_zone` is `NULL` or invalid:

- Falls back to the **operator's local browser clock** (same behavior as F1 pilot before timezone support).
- A console warning is logged for invalid timezone strings.

## Future Behavior (F3+)

When multi-timezone support is needed:

1. Admin sets `providers.time_zone` in Provider Settings.
2. All date-based queries automatically use the provider's timezone.
3. The `getProviderTodayDates` util is the single source of truth for "what day is it for this provider."

## Technical Details

| Component | Location |
|-----------|----------|
| Timezone util | `src/lib/provider-dates.ts` |
| Dashboard hook | `src/hooks/useDashboardData.ts` |
| DB column | `providers.time_zone` (text, default `'Europe/Prague'`) |
| Implementation | `Intl.DateTimeFormat` with `en-CA` locale (native YYYY-MM-DD) |
