# Design System — Index

> Rozcestník SSOT dokumentů a Design Constitution. Kitloop = Calm Ops, data-dense, status-first (provider B2B).

---

## Rozcestník

| Dokument | Obsah |
|----------|--------|
| [DESIGN_TOKENS.md](./DESIGN_TOKENS.md) | Barvy, plochy (5 úrovní), status (3 patterny), focus, tabulky |
| [BOX_PATTERNS.md](./BOX_PATTERNS.md) | Typy boxů: Card, TableContainer, InsetBox, StatusCallout, OverlaySurface |
| [EFFECTS_TOKENS.md](./EFFECTS_TOKENS.md) | Stíny (3 úrovně), border-first, zákaz bluru v ops |
| [MOTION_TOKENS.md](./MOTION_TOKENS.md) | Animace (4 patterny), timing, easing, prefers-reduced-motion |
| [DASHBOARD_PATTERNS.md](./DASHBOARD_PATTERNS.md) | Layout dashboardu, 12-col grid, widget pravidla |
| [PR_CHECKLIST_UI.md](./PR_CHECKLIST_UI.md) | Krátký checklist pro review UI změn |
| [ENFORCEMENT.md](./ENFORCEMENT.md) | Lint (diff-gated), co kontroluje, TODO |
| [GOLDEN_SCREENSHOTS.md](./GOLDEN_SCREENSHOTS.md) | Referenční „expected look“ (Dashboard, Reservations, Issue/Return) |
| [SSOT_UI_SYSTEM.md](./SSOT_UI_SYSTEM.md) | Celkový shrnutý systém (kontext, pravidla, enforcement, otevřené otázky) |

**Implementace:** `src/index.css`, `tailwind.config.ts`, `src/lib/status-colors.ts`  
**Enforcement:** `scripts/lint-hardcoded-colors.sh` (diff-gated), [ENFORCEMENT.md](./ENFORCEMENT.md), PR checklist.  
**Pilot verification:** [docs/verification/ui_smoke.md](../verification/ui_smoke.md) — grayscale, focus walk, table rule, status patterns.

**Doc-first:** Nový vizuální pattern (box, shadow, motion, dashboard widget) se **nejdřív přidá do SSOT docs**, teprve potom do UI.

---

## Design Constitution (10 pravidel)

1. **Pět ploch jen** — Canvas (`bg-background`), Surface (`bg-card`), Overlay (`bg-popover`), Inset (`bg-muted`), Highlight (`bg-accent`). Žádné `bg-slate-*`, `bg-gray-*`, `bg-white`; žádná opacity na plochách.

2. **Border-first** — Card a tabulka vždy `border border-border`; overlay vždy border + `shadow-elevated`. Muted defaultně bez borderu.

3. **Status jen třemi způsoby** — soft (`bg-status-*/10 text-status-* border border-status-*/20`), solid (`bg-status-* text-status-foreground`), outline (`border border-status-*/40 text-status-* bg-transparent`). Žádné ad-hoc emerald/amber/red.

4. **Brand ≠ status** — Brand jen pro focus ring, nav selected, link, volitelně primary CTA. Status pouze přes StatusBadge / helper / Badge varianty.

5. **Focus jednotně** — `ring-ring` / `outline-ring` (brand teal). Zákaz `ring-primary`.

6. **Max 5 typů boxů** — Card, TableContainer, InsetBox, StatusCallout, OverlaySurface. Žádné další “panel” varianty; v provider ops zákaz `bg-white`, `shadow-sm`, `backdrop-blur-*`.

7. **Stíny jen 3 úrovně** — `shadow-none`, `shadow-card` (volitelně, jen busy layout), `shadow-elevated` (pouze overlay). Blur/glass v ops zakázán.

8. **Motion funkční, ne show** — povolené: Fade, Scale+fade, Slide Y, Skeleton; timing 120/180/240 ms; respektovat `prefers-reduced-motion`. Zakázáno: nekonečné bounce/ping, “glow” jako urgency.

9. **Tabulka vždy v bg-card kontejneru** — thead vždy `bg-muted`; kontejner `rounded-md overflow-hidden border border-border`.

10. **Enforcement diff-gated** — lint hlásí pouze změněné soubory; při dotyku se opraví jen dotčená část. PR review dle [PR_CHECKLIST_UI.md](./PR_CHECKLIST_UI.md).

11. **Doc-first** — Nový vizuální pattern (box, stín, animace, dashboard widget) se nejdřív přidá do SSOT dokumentu, teprve potom do UI. Žádné ad-hoc výjimky.
