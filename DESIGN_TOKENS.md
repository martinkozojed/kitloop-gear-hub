# Kitloop Design Tokens

> **SSOT (Single Source of Truth) for UI styling. Read before writing any UI code.**

## Quick Reference

### Radius

| Class | Value | Use |
|-------|-------|-----|
| `rounded-token-sm` | 6px | Badges, chips |
| `rounded-token-md` | 10px | Buttons, inputs |
| `rounded-token-lg` | 16px | Cards, modals |
| `rounded-token-xl` | 24px | **Marketing only** |

### Shadow

| Class | Use |
|-------|-----|
| `shadow-xs` | Subtle elevation |
| `shadow-card` | Default cards |
| `shadow-elevated` | Modals, dropdowns |
| `shadow-elevated` | Modals, dropdowns |
| `shadow-brand` | **Marketing CTA only** |
| `shadow-hero` | **Marketing Hero only** (complex green glow) |

### Gradient

| Class | Use |
|-------|-----|
| `gradient-cta` | **Marketing CTA buttons only** |
| `bg-[image:var(--hero-glow)]` | **Marketing Hero Backgrounds** (Sky/Green radial) |

## Components (PR3)

### Badge

- **Variants:** `default` (primary), `secondary`, `outline`, `destructive`, `success`, `warning`, `info`.
- **Radius:** Always `rounded-token-sm` (6px).
- **Usage:** Use `getBadgeVariant(status)` helper for dynamic status badges.

### Button

- **Radius:** Always `rounded-token-md` (10px).
- **Icons:** Always 16px (`w-4 h-4`) inside buttons.
- **Variants:** See `button.tsx` SSOT.

---

## ✅ Do

```tsx
// Cards
<div className="rounded-token-lg shadow-card bg-card p-6">

// Buttons
<Button className="rounded-token-md">

// Marketing CTA
<Button className="gradient-cta rounded-token-xl shadow-brand">

// Colors
<div className="bg-primary text-primary-foreground">
<div className="border-border bg-muted">
<Badge className="bg-emerald-100 text-emerald-800">
```

## ❌ Don't

```tsx
// Hardcoded colors (BLOCKED by CI)
<div className="bg-[#2E7D32]">        // ❌ Use bg-primary
<div style={{ color: '#1F1F1F' }}>   // ❌ Use text-foreground
<div className="shadow-[0_4px_12px_rgba(0,0,0,0.1)]"> // ❌ Use shadow-card

// Wrong radius
<div className="rounded-3xl">  // ❌ Use rounded-token-lg or rounded-token-xl
<div className="rounded-full"> // ⚠️ OK only for avatars/pills

// Ad-hoc gradients
<div className="bg-gradient-to-r from-green-500 to-emerald-600"> // ❌ Use gradient-cta
```

---

### Icons

Use the `<Icon>` wrapper for all icons to ensure consistent sizing and sizing defaults.
Button icons are automatically sized to 16px (sm) by component defaults, but the wrapper enforces standard sizing everywhere else.

**Usage:**

```tsx
import { Icon } from "@/components/ui/icon";
import { Check } from "lucide-react";

// Default (16px)
<Icon icon={Check} />

// Sizes (sm=16, md=20, lg=24, xl=32)
<Icon icon={Check} size="md" />

// With color
<Icon icon={Check} className="text-emerald-500" />
```

## Enforcement

CI will FAIL if hardcoded colors are found:

```bash
npm run lint:colors
```

## Files

- **Tokens defined in:** `src/index.css`
- **Tailwind config:** `tailwind.config.ts`
- **CI script:** `scripts/lint-hardcoded-colors.sh`

---

## 🏗️ How to build UI in Kitloop (Quick Start)

When building a new page or component, follow this pattern to ensure consistency:

### 1. Page Layout

Start with the standard **Card** components.

```tsx
// Page Container (Standard)
<div className="space-y-6">
  {/* Header */}
  <div className="flex items-center justify-between">
    <h1 className="text-2xl font-bold font-heading">Page Title</h1>
    <Button>Action</Button>
  </div>

  {/* Content Card */}
  <Card>
    <CardHeader>
      <CardTitle>Section Title</CardTitle>
      <CardDescription>Helper text here</CardDescription>
    </CardHeader>
    <CardContent>
      {/* Your form or content */}
    </CardContent>
  </Card>
</div>
```

### 2. Status Badges

Use the helper function `getStatusColorClasses` or semantic variant.

```tsx
import { Badge } from "@/components/ui/badge";
import { getStatusColorClasses } from "@/lib/status-colors";

// Dynamic Status
<Badge className={getStatusColorClasses(status)}>
  {t(`status.${status}`)}
</Badge>

// Static Status
<Badge variant="success">Active</Badge> // Uses status-success token
```

### 3. Tables / Lists

Use `shadow-card` and `rounded-token-lg` for containers.

```tsx
<div className="rounded-token-lg border border-border bg-card shadow-card overflow-hidden">
  <Table>
    <TableHeader>...</TableHeader>
    <TableRow className="hover:bg-muted/50 transition-colors">...</TableRow>
  </Table>
</div>
```
