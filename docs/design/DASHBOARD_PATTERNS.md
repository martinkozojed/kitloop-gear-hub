# Dashboard Layout Framework

> **SSOT** for provider dashboard: modular, data-dense, consistent widgets. No “bento chaos”.

---

## Allowed / Forbidden / Why

| Allowed | Forbidden | Why |
|--------|-----------|-----|
| 12-col grid; row 1 = KPI cards (same height); row 2 = Today lists/tables + side panel (Overdue/Alerts) | Custom widget backgrounds; bento-style random layout | Predictable scan; same widget pattern everywhere. |
| Each widget = Card with same header pattern | Headers with multiple primary actions; custom widget chrome | One action per widget in header; rest in overflow. |
| Status inside widgets via badges/callouts only | Status as widget background or custom colored panels | Status = StatusCallout + Badge; see DESIGN_TOKENS. |

---

## Desktop layout (SSOT)

- **Grid:** 12 columns.
- **Row 1:** KPI cards (equal height).
- **Row 2:** Today lists/tables + side panel (e.g. Overdue / Alerts).

---

## Tablet layout

- **Single column:** KPI → Today → Overdue (stacked).

---

## Widget rules

1. **Every widget = Card** (see [BOX_PATTERNS.md](./BOX_PATTERNS.md)): `bg-card border border-border rounded-md`; optional `shadow-card` for dashboard grid.
2. **Header pattern (unified):**
   - Title left.
   - **One** primary action right; additional actions in overflow (dropdown or “More”).
3. **No custom widget backgrounds;** status only via badges and status callouts inside the card.

---

## Examples

### Do

```tsx
// Dashboard grid (12-col)
<div className="grid grid-cols-12 gap-4">
  <div className="col-span-3">
    <div className="bg-card border border-border rounded-md shadow-card p-4 h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Today's pickups</h3>
        <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
      </div>
      <p className="text-2xl font-heading font-bold">12</p>
    </div>
  </div>
  {/* ... more KPI cards same height ... */}
</div>

// Widget with status callout inside
<div className="bg-card border border-border rounded-md p-4">
  <div className="flex items-center justify-between mb-3">
    <h3 className="font-semibold">Overdue</h3>
    <Button variant="outline" size="sm">View all</Button>
  </div>
  <div className="rounded-md border border-status-danger/20 bg-status-danger/10 p-3 text-status-danger text-sm">
    2 items overdue
  </div>
</div>
```

### Don't

```tsx
// ❌ Custom widget background
<div className="bg-gradient-to-br from-muted to-card border border-border">

// ❌ Multiple header actions (use overflow)
<div className="flex justify-between">
  <h3>Title</h3>
  <div><Button>A</Button><Button>B</Button><Button>C</Button></div>
</div>
```

---

## Enforcement

- **Review:** [PR_CHECKLIST_UI.md](./PR_CHECKLIST_UI.md) — Dashboard widgets = Card; header pattern; no custom backgrounds.
- **Lint:** Surfaces and box patterns enforced via DESIGN_TOKENS + BOX_PATTERNS; no dedicated dashboard lint (review checklist).
