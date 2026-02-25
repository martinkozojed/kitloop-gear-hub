# Design Tokens (Colors, Surfaces, Status)

> **SSOT (Single Source of Truth)** for UI colors, surfaces, and status. Read before writing any UI code.  
> For **public pages** (onboarding, login, signup) the section **Public surfaces** below applies in addition.

---

## Allowed / Forbidden / Why

| Area | Allowed | Forbidden | Why |
|------|--------|-----------|-----|
| **Surfaces** | Exactly 5 roles: `bg-background`, `bg-card`, `bg-popover`, `bg-muted`, `bg-accent` | `bg-slate-*`, `bg-gray-*`, `bg-white`, any opacity on surfaces (`bg-muted/50`, `bg-card/50`, …) | Prevents UI drift; grayscale hierarchy stays readable. |
| **Borders** | `border-border` on Card/Table/Overlay; muted defaultně bez borderu | Borderless card on canvas; overlay without border | Border-first separation is primary; shadow is secondary. |
| **Hover/selected** | `bg-accent` only (no opacity) | `bg-accent/50`, border change for selection | Highlight layer is semantic; opacity causes inconsistency. |
| **Brand vs status** | Brand: focus ring, nav selected, link, (optional) primary CTA. Status: only via StatusBadge/helper/Badge variants | `ring-primary`; ad-hoc `bg-emerald-*`, `bg-amber-*`, `text-amber-*` | Brand ≠ status; status meaning only through token system. |
| **Focus** | `ring-ring` / `outline-ring` (brand teal) | `ring-primary` | Single focus language; ring maps to --ring (brand). |
| **Status** | 3 patterns only (soft / solid / outline) with `--status-*` tokens | Ad-hoc emerald/amber/red utilities outside status system | One semantic system for status; no one-off colors. |

---

## 1. Five surface levels (SSOT)

| Level | Token | Tailwind | Use |
|-------|--------|----------|-----|
| **Canvas** | `--background` | `bg-background` | Page only. |
| **Surface** | `--card` | `bg-card` | Cards, tables, forms. |
| **Overlay** | `--popover` | `bg-popover` | Dialogs, popovers, dropdowns. |
| **Inset** | `--muted` | `bg-muted` | Table head, filter bar, secondary blocks inside card. |
| **Highlight** | `--accent` | `bg-accent` | Hover/selected/active — **never status**. |

**Forbidden:** `bg-slate-*`, `bg-gray-*`, `bg-white`, and any opacity on these surfaces (e.g. `bg-muted/50`, `bg-card/50`).  
**Allowed opacity:** status and brand only (e.g. `bg-status-success/10`, `bg-brand/10`). Lint blokuje jen surface tokeny — `bg-status-*/10` (soft varianta) není blokováno.

---

## 2. Border-first separation (mandatory)

- **Card / Table container:** always `border border-border` (or `border-border/60` in light). Never borderless card on canvas.
- **Popover / Dialog:** always `border border-border` **and** shadow (overlay has depth).
- **Muted (inset):** defaultně bez borderu; separation by background + spacing only.
- **Hover/selected:** use `bg-accent`, not a border change.

---

## 3. Contrast minima (non-negotiable)

- **Text:** minimum **4.5:1** against its background.
- **Borders, input outline, focus ring:** minimum **3:1** against adjacent surface.

Tokens (`--muted-foreground`, `--input`, `--border`, status soft via alpha) must satisfy these.

---

## 4. Brand ≠ status

- **Brand** (`--brand`, `ring-ring`) = focus ring, active nav item, selected state (when not status), links. Primary CTA may be brand only if explicitly desired.
- **Status** = only via `StatusBadge`, `getStatusColorClasses`, or Badge variants `success` / `warning` / `info` / `destructive`. No ad-hoc status colors.

---

## 5. Status — three patterns only

Use only these; no extra freedom:

| Pattern | Usage (Tailwind) |
|---------|------------------|
| **Soft** | `bg-status-*/10 text-status-* border border-status-*/20` |
| **Solid** | `bg-status-* text-status-foreground` (e.g. `text-status-success-foreground` via token) |
| **Outline** | `border border-status-*/40 text-status-* bg-transparent` |

**Tokens:** `--status-success`, `--status-info`, `--status-warning`, `--status-danger`, `--status-neutral`, `--status-foreground`.

**Forbidden:** status meaning via `bg-emerald-*`, `bg-amber-*`, etc. outside the status system.

---

## 6. Focus

- **Unified:** `ring-ring` / `outline-ring` (brand teal).  
- **Forbidden:** `ring-primary`.

---

## 7. Tables (implementation facts)

- **thead** globally `bg-muted`.
- Table **must** always sit in a `bg-card` container with `border border-border rounded-md overflow-hidden`.
- **Forbidden:** thead overrides to `bg-card` or `bg-background`; table directly on canvas without card container; `bg-muted/50` or `bg-white`/`shadow-sm` as container.

---

## Quick reference: radius & shadow

| Class | Value | Use |
|-------|-------|-----|
| `rounded-token-sm` | 6px | Badges, chips |
| `rounded-token-md` | 10px | Buttons, inputs |
| `rounded-token-lg` | 16px | Cards, modals |
| `rounded-token-xl` | 24px | **Marketing only** |

Shadow tiers: see [EFFECTS_TOKENS.md](./EFFECTS_TOKENS.md). Surfaces do not use opacity.

---

## Public surfaces (onboarding, login, signup)

- **Button variant `marketing`:** Allowed only on public pages (onboarding, login, marketing). Forbidden in provider; lint fails if used in `src/pages/provider/**`.
- **Gradient:** Only on CTA buttons. No gradients on cards, FAQ, or Final CTA box.
- **Dark accent blocks:** `bg-inverse`, `text-inverse-foreground` only (no ad-hoc `bg-slate-900`).
- **Section backgrounds:** `bg-background`, `bg-subtle`, or `bg-card`; avoid raw `bg-slate-50/70`.

---

## Examples

### Do (surfaces + status + focus)

```tsx
// Card container
<div className="rounded-token-lg border border-border bg-card p-6">

// Table container
<div className="rounded-token-lg border border-border bg-card overflow-hidden">
  <Table>
    <TableHeader className="bg-muted">...</TableHeader>
    <TableRow className="hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
      ...
    </TableRow>
  </Table>
</div>

// Status (soft) via helper
<Badge className={getStatusColorClasses(status)}>{t(`status.${status}`)}</Badge>

// Focus (global in index.css: outline-ring / ring-ring)
<Button className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
```

### Don't

```tsx
// ❌ Hardcoded / wrong surface
<div className="bg-white bg-muted/50">
<div className="bg-slate-100">

// ❌ Status outside system
<span className="bg-amber-100 text-amber-800">

// ❌ Wrong focus
<button className="ring-primary">
```

---

## Enforcement

- **Script:** `scripts/lint-hardcoded-colors.sh` (run via `npm run lint:colors`).
- **Diff-gate:** Lint runs only on **changed files** (diff vs `origin/main`). When you touch a file with a violation, fix only the relevant part.
- **Rules enforced:** No hex/rgba in TS/TSX (except allowed files); no `bg-slate-*`, `bg-gray-*`, surface opacity (`bg-muted/50`, …), no `ring-primary`, no ad-hoc status utilities; in `src/pages/provider/` no `bg-white` or `shadow-sm`.
- **Allowed:** `bg-status-*/10`, `bg-brand/10` for opacity.

---

## Files

- **Tokens:** `src/index.css`
- **Tailwind:** `tailwind.config.ts`
- **Status helper:** `src/lib/status-colors.ts`
- **CI:** `scripts/lint-hardcoded-colors.sh`
