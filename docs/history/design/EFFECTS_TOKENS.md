# Elevation & Effects Tokens

> **SSOT** for shadows and effects. Border-first; shadow is secondary.

---

## Allowed / Forbidden / Why

| Allowed | Forbidden | Why |
|--------|-----------|-----|
| Exactly 3 shadow tiers: `shadow-none`, `shadow-card`, `shadow-elevated` | Ad-hoc shadows; `shadow-sm` in provider ops; blur/glass in ops | Prevents visual noise and inconsistency. |
| Border as primary separator | Relying on shadow alone for separation | Surfaces stay clear in grayscale. |
| `shadow-card` only for busy layout (e.g. dashboard) | `shadow-card` on every card | Default is border-only; shadow optional. |
| `shadow-elevated` only on overlay (popover, dialog) | `shadow-elevated` on page-level cards | Overlay = popover + border + shadow-elevated. |
| Blur/glass in onboarding/marketing only (if at all) | `backdrop-blur-*` in provider ops | Calm Ops = no glass in data-dense UI. |

---

## Shadow tiers (only 3)

| Token (Tailwind) | CSS var | Use |
|------------------|---------|-----|
| `shadow-none` | — | Default; no elevation. |
| `shadow-card` | `--shadow-card` | **Only by exception** — optional card elevation (e.g. dashboard grid); default je border-only. |
| `shadow-elevated` | `--shadow-elevated` | **Overlay only** — dialogs, popovers, dropdowns. Nikdy na page-level kartách. |

**Pravidla:**

- **Overlay only = shadow-elevated.** Popover/dialog vždy `bg-popover` + `border` + `shadow-elevated`.
- **shadow-card only by exception.** Na běžných kartách žádný stín; jen tam, kde je to potřeba (busy layout).
- Border-first je primární separátor; shadow je sekundární.
- Blur/glass je **forbidden** v ops (onboarding/marketing pouze, pokud vůbec).
- **Terminologie:** V SSOT existují jen tyto 3 úrovně. Token `shadow-xs` je v kódu, ale **není součástí SSOT** — pro volitelnou elevaci karty používejte `shadow-card`, ne `shadow-xs` (jedna jasná úroveň).

---

## Marketing-only (out of scope for ops)

- `shadow-brand`, `shadow-hero`, `shadow-hero-hover` — CTA / Hero only.
- Defined in `src/index.css` / `tailwind.config.ts`; do not use in provider dashboard or lists.

---

## Examples

### Do

```tsx
// Card (no shadow default)
<div className="bg-card border border-border rounded-md">...</div>

// Dashboard widget (optional shadow)
<div className="bg-card border border-border rounded-md shadow-card">...</div>

// Overlay (dialog / popover)
<div className="bg-popover border border-border rounded-lg shadow-elevated">...</div>
```

### Don't

```tsx
// ❌ shadow-sm in provider
<div className="bg-card shadow-sm border border-border">

// ❌ shadow-elevated on page card
<div className="bg-card shadow-elevated rounded-md">

// ❌ blur in ops
<div className="bg-card/80 backdrop-blur-sm">
```

---

## Enforcement

- **Lint:** `shadow-sm` forbidden in `src/pages/provider/` (see `scripts/lint-hardcoded-colors.sh`).
- **Review:** [PR_CHECKLIST_UI.md](./PR_CHECKLIST_UI.md) — Overlay = popover + border + shadow-elevated; no blur in ops.
