# UI Drift Report 🛡️

**Date:** 2026-01-23
**Status:** Baseline Established
**Total Potential Violations:** ~13

## Summary

The codebase is largely standardized. Most components use `text-sm/xs`, `shadow-card`, and `rounded-token-*`.
A few clusters of "Arbitrary Values" (Drift) remain, mostly in complex dashboard pages (`Analytics`, `ReservationDetail`) or legacy `SignUp`.

## Top Offenders (Drift Hotspots)

### 1. Hardcoded Text Sizes (`text-[10px]`)

- **File:** `src/pages/provider/ReservationDetail.tsx`
- **Violation:** `<Badge className="text-[10px]">`
- **Recommendation:** Migrate to `text-xs` (12px) or standard `Badge` sizing.

### 2. Arbitrary Shadows (`shadow-[...]`)

- **File:** `src/pages/provider/ProviderAnalytics.tsx`
- **Violation:** Custom green shadows on ToggleGroup (`shadow-[0_10px_25px_-18px...]`).
- **Recommendation:** Replace with `shadow-sm` or standard `status-success` ring if emphasis is needed. Custom arbitrary shadows shouldn't exist in Dashboard.

### 3. Allowed Exceptions (Whitelist)

- `src/pages/HowItWorks.tsx`: `bg-[image:var(--hero-glow)]` (Marketing Token)
- `src/pages/About.tsx`: `bg-[image:var(--hero-glow)]` (Marketing Token)
- `src/pages/Index.tsx`: Grid Background patterns (Structural).

## Next Steps

1. **Fix `ReservationDetail` badges** (Easy win).
2. **Standardize `ProviderAnalytics` toggles** (Remove custom shadow).
3. **Run `scripts/ui-drift-scan.sh` weekly** to ensure count decreases or stays at 0 (excluding whitelist).
