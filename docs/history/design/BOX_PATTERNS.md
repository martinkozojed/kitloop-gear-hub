# Box / Container Patterns

> **SSOT** for container types. Max 4–5 box types; no ad-hoc “panel” variants.

---

## Allowed / Forbidden / Why

| Allowed | Forbidden | Why |
|--------|-----------|-----|
| Card, TableContainer, InsetBox, StatusCallout, OverlaySurface (only these 5) | `bg-white`, `shadow-sm`, `backdrop-blur-*` in provider ops; any box variant not in SSOT | Prevents layout drift and “one-off” panels. |
| Card may use `shadow-card` only where needed (e.g. dashboard grid) | `shadow-card` everywhere; default shadow on every card | Shadow is optional for busy layouts; border-first. |

---

## Allowed box types (SSOT)

### 1. Card

- **Use:** Generic content block, dashboard widgets, forms.
- **Classes:** `bg-card border border-border rounded-md`
- **Optional:** `shadow-card` only for dashboard/grid busy layout (default off).

```tsx
<div className="bg-card border border-border rounded-md p-6">
  <h3>Section title</h3>
  <p>Content</p>
</div>

// With optional shadow (dashboard only)
<div className="bg-card border border-border rounded-md shadow-card p-6">...</div>
```

### 2. TableContainer

- **Use:** Wrapper around `<Table>` so thead (bg-muted) separates from canvas.
- **Classes:** `bg-card border border-border rounded-md overflow-hidden`

```tsx
<div className="bg-card border border-border rounded-md overflow-hidden">
  <Table>
    <TableHeader>...</TableHeader>
    <TableBody>...</TableBody>
  </Table>
</div>
```

### 3. InsetBox

- **Use:** Secondary block inside card (filter bar, helper block).
- **Classes:** `bg-muted rounded-md` (no border by default).

```tsx
<div className="bg-muted rounded-md p-4">
  <p className="text-muted-foreground">Filter or helper content</p>
</div>
```

### 4. StatusCallout

- **Use:** Warning/info/success/danger callouts only.
- **Pattern:** Status soft pattern only — e.g. `bg-status-warning/10 text-status-warning border border-status-warning/20`. No custom backgrounds.

```tsx
<div className="rounded-md border border-status-warning/20 bg-status-warning/10 p-4 text-status-warning">
  <span className="font-medium">Attention:</span> Please confirm before proceeding.
</div>
```

### 5. OverlaySurface

- **Use:** Popover, dialog, dropdown panel.
- **Classes:** `bg-popover border border-border rounded-lg shadow-elevated`

```tsx
<div className="bg-popover border border-border rounded-lg shadow-elevated p-4">
  Dropdown or popover content
</div>
```

---

## Forbidden

- **Provider ops:** `bg-white`, `shadow-sm`, `backdrop-blur-*`.
- **Any** box variant not listed above (e.g. custom “panel” with different border/radius).
- **Volnost:** Only whether Card uses `shadow-card` (default off; allow for dashboard/grid).

---

## Enforcement

- **Lint:** `scripts/lint-hardcoded-colors.sh` flags `bg-white` and `shadow-sm` in `src/pages/provider/`.
- **Review:** [PR_CHECKLIST_UI.md](./PR_CHECKLIST_UI.md) — Card/Table border-first; Overlay = popover + border + shadow-elevated.
