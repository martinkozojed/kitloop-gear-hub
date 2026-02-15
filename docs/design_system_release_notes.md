# Design System Implementation v1.0 - Release Notes

**Date:** 2026-01-23
**Status:** Released & Enforced

## 🚀 Unified

- **Radius:** Standardized to `token-sm` (6px), `token-md` (10px), `token-lg` (16px).
- **Shadows:** Standardized to `shadow-xs`, `shadow-card`, `shadow-elevated`. Custom shadows removed.
- **Status Colors:** Semantic tokens (`status-warning`, `status-success`, etc.) used everywhere. No more `bg-orange-50`.
- **Icons:** Standardized sizing via `<Icon>` wrapper. Button icons always 16px.
- **Typography:** Removed `text-[10px]` and arbitrary sizes. Use `text-xs/sm/base`.

## ⛔ Prohibited

- **Hardcoded Colors:** `text-[#...]`, `bg-rgb(...)` are blocked by CI (`lint:colors`).
- **Arbitrary Values:** `text-[12px]`, `shadow-[...]`, `rounded-[4px]` are tracked as drift.
- **Marketing Tokens:** `shadow-hero`, `gradient-cta` are NOT allowed in the Dashboard app.

## 🛡️ Governance

- **CI Enforcement:** `lint:colors` prevents new hardcoded colors.
- **Drift Scan:** `scripts/ui-drift-scan.sh` monitors codebase cleanliness.
- **PR Template:** Includes Design System checklist.
