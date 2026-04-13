# Motion Tokens

> **SSOT** for animation: functional microinteractions, “object constancy”, no show.

---

## Allowed / Forbidden / Why

| Allowed | Forbidden | Why |
|--------|-----------|-----|
| Max 4 patterns: Fade, Scale+fade, Slide Y, Skeleton | Infinite attention (bounce, ping); “glow” as urgency | Urgency = status callout; motion = orientation, not distraction. |
| Timing: 120ms (micro), 180ms (default), 240ms (complex) | Arbitrary long durations | Predictable, fast feedback. |
| Easing: enter = ease-out, exit = ease-in | ease-in-out everywhere | Clear enter/exit feel. |
| `prefers-reduced-motion`: limit transform, keep fade | Ignoring reduced-motion | A11y requirement. |

---

## Allowed patterns (max 4)

| Pattern | Use | Implementation |
|---------|-----|----------------|
| **Fade** | Popover, tooltip | `opacity` transition |
| **Scale + fade** | Dialog / popover enter | `opacity` + `transform: scale` |
| **Slide Y** | Sheet | `transform: translateY` |
| **Skeleton** | Loading | Pulse / shimmer (no bounce) |

---

## Timing tokens

| Token | Duration | Use |
|-------|----------|-----|
| Micro | 120ms | Hover, small state change |
| Default | 180ms | Most UI transitions |
| Complex | 240ms | Sheet, modal open/close |

**Easing:**

- **Enter:** `ease-out`
- **Exit:** `ease-in`

---

## A11y: prefers-reduced-motion

- **Respect** `prefers-reduced-motion: reduce`.
- **Strategy:** Limit or remove `transform` (scale, translate); keep `opacity` (fade) where possible.
- **Forbidden:** Ignoring reduced-motion for decorative or attention-grabbing animation.

```css
@media (prefers-reduced-motion: reduce) {
  .animate-scale-fade {
    transform: none;
    transition: opacity 0.18s ease-out;
  }
}
```

---

## Examples

### Do

```tsx
// Fade (popover)
<div className="transition-opacity duration-150 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">

// Sheet slide (Tailwind / tailwindcss-animate)
<div className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom">

// Skeleton loading
<div className="animate-pulse rounded-md bg-muted h-4" />
```

### Don't

```tsx
// ❌ Attention animation
<div className="animate-bounce">
<span className="animate-ping">

// ❌ Glow as urgency (use status callout instead)
<div className="animate-pulse ring-2 ring-amber-400">
```

---

## Implementation note

- **MVP:** Prefer **CSS transitions** only. Framer Motion only if we explicitly add it for overlay/sheet later.
- **Existing:** `tailwind.config.ts` has `fade-in` / `fade-out` keyframes (0.4s ease-out); accordion 0.2s. Prefer duration tokens above (120 / 180 / 240 ms) for new work.

---

## Enforcement

- **Review:** [PR_CHECKLIST_UI.md](./PR_CHECKLIST_UI.md) — No infinite or attention-grabbing motion; reduced-motion considered.
- **Motion lint je volitelné.** Pokud se zapne, zakazuje `animate-bounce`, `animate-ping` a nekonečné animace. Víc se nevyžaduje.
