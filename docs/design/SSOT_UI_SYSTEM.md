# SSOT UI System — Summary

> Jediný shrnutý dokument celého design systému. Pro detail viz jednotlivé SSOT soubory v [INDEX.md](./INDEX.md).

---

## 0) Kontext značky a směru

**Kitloop** = Calm Ops, data-dense, status-first (provider-only B2B ops).

- Outdoor DNA je **subtilní** (tone, microcopy, minimální brand accent), ne dekorace v ops UI.
- **Cíl:** rychlý flow (rezervace → issue/return → přehled), minimální chyby, maximální čitelnost.

---

## 1) Surface & Color System (uzamčeno)

**5 úrovní ploch (SSOT):**

| Úroveň | Token | Tailwind |
|--------|--------|----------|
| Canvas | `--background` | `bg-background` |
| Surface | `--card` | `bg-card` |
| Overlay | `--popover` | `bg-popover` |
| Inset | `--muted` | `bg-muted` |
| Highlight | `--accent` | `bg-accent` (hover/selected/active — NE status) |

**Zákazy:** žádné `bg-slate-*`, `bg-gray-*`, `bg-white`; žádná opacity na surfaces (`bg-muted/50`, `bg-card/50`, …).

**Border-first separace (SSOT):** Card/Table container vždy `border border-border`; Overlay vždy `border border-border` + `shadow-elevated`; Muted (inset) defaultně bez borderu. Hover/selected vždy `bg-accent` (bez opacity).

**Brand ≠ Status:** Brand smí být jen: focus ring, nav selected, link, (volitelně) primary CTA. Status barvy pouze přes StatusBadge/helper/Badge varianty.

**Status tokeny:** `--status-success`, `--status-info`, `--status-warning`, `--status-danger`, `--status-neutral`, `--status-foreground`.

**Status patterny (pouze 3):**

- **soft:** `bg-status-*/10 text-status-* border border-status-*/20`
- **solid:** `bg-status-* text-status-foreground`
- **outline:** `border border-status-*/40 text-status-* bg-transparent`

**Zákaz:** ad-hoc emerald/amber/red utility mimo status systém.

**Focus:** jednotně `ring-ring` / `outline-ring` (brand teal). Zákaz `ring-primary`.

**Implementační fakta (už hotovo):** `src/index.css`: kompletní surfaces + actions + status, v HSL, včetně `.dark` bloku; zachováno radius/shadow/hero-glow/bg-subtle/bg-inverse/text-inverse. `tailwind.config.ts`: mapování brand a status na CSS vars. Tables: thead globálně `bg-muted`; tabulky musí být vždy v `bg-card` containeru. Reservations list + accounts + customers: tabulky v `bg-card border-border rounded-md overflow-hidden`; odstraněny overrides `bg-muted/50` a `bg-white`/`shadow-sm`. Issue/Return: warning bloky sjednoceny na status soft pattern + border; ikony na `text-status-warning`. Focus na řádcích sjednocen na `ring-ring`.

---

## 2) Box / Container System (SSOT)

**Cíl:** max 4–5 box typů, žádné ad-hoc “panel” varianty.

**Allowed box types:**

- **Card:** `bg-card border border-border rounded-md`; volitelně `shadow-card` (jen tam, kde potřeba — typicky dashboard grid).
- **TableContainer:** `bg-card border border-border rounded-md overflow-hidden`.
- **InsetBox:** `bg-muted rounded-md` (bez borderu default).
- **StatusCallout:** jen status soft pattern (viz výše).
- **OverlaySurface:** `bg-popover border border-border rounded-lg shadow-elevated`.

**Forbidden:** `bg-white`, `shadow-sm`, `backdrop-blur-*` v provider ops; další varianty boxů mimo SSOT.

**Volnost (minimální):** zda Card smí používat `shadow-card` (default off; povolit jen pro dashboard/grid).

---

## 3) Elevation & Effects System (SSOT)

**Shadow tiers (pouze 3):** `shadow-none` (default), `shadow-card` (volitelné, jen pro busy layouty), `shadow-elevated` (overlay only).

**Rules:** Border-first je primární separátor, shadow je sekundární. Blur/glass je zakázán v ops (jen onboarding/marketing, pokud vůbec).

---

## 4) Motion System (SSOT)

**Cíl:** funkční microinteractions, “object constancy”, bez show.

**Allowed patterns (max 4):** Fade (popover, tooltip), Scale+fade (dialog/popover enter), Slide Y (sheet), Skeleton (loading).

**Timing tokeny:** 120ms (micro), 180ms (default), 240ms (complex). **Easing:** enter = ease-out, exit = ease-in.

**A11y:** respektovat `prefers-reduced-motion` (omezit transform, nechat jen fade).

**Forbidden:** nekonečné attention animace (bounce/ping); “glow” jako indikace urgency (urgency řeší status callout).

---

## 5) Dashboard Layout Framework (SSOT)

**Cíl:** modulární, data-dense, konzistentní widgety, žádné “bento chaos”.

**Jednotný layout pattern (desktop):** 12-col grid; řada 1: KPI cards (stejná výška); řada 2: Today lists/tables + side panel (Overdue/Alerts).

**Tablet:** 1 sloupec, KPI → Today → Overdue.

**Widget rules:** každý widget = Card (stejný header pattern); header: title vlevo, 1 akce vpravo (další akce do overflow); žádné custom backgrounds widgetů; statusy uvnitř přes badges/callouts.

---

## 6) Governance & Drift Prevention (SSOT)

**SSOT docs:** [DESIGN_TOKENS.md](./DESIGN_TOKENS.md), [BOX_PATTERNS.md](./BOX_PATTERNS.md), [EFFECTS_TOKENS.md](./EFFECTS_TOKENS.md), [MOTION_TOKENS.md](./MOTION_TOKENS.md), [DASHBOARD_PATTERNS.md](./DASHBOARD_PATTERNS.md).

**Enforcement:** `scripts/lint-hardcoded-colors.sh` — zakázat: `bg-white`, `shadow-sm`, `ring-primary`; zakázat opacity na surfaces: `bg-(muted|card|background|popover|accent)/[0-9]+`; povolit opacity pro status: `bg-status-*/(10|15|20)` atd. **Diff-gate:** lint hlásí až dotčené soubory vůči main; při dotyku se opravuje pouze relevantní část.

**PR checklist (minimální, 6 bodů):** Surfaces jen 5 rolí + bez opacity; Card/Table containers border-first; Status jen 3 patterny, žádné ad-hoc barvy; Focus ring jednotně ring-ring; Table vždy v bg-card containeru, thead vždy bg-muted; Overlay = popover + border + shadow-elevated.

---

## Otázky k dořešení (aby to bylo “nezničitelné”)

- **Zařízení a podmínky provozu:** desktop/tablet? světlo? (ovlivní density, border sílu, target sizes)
- **Dashboard priority:** co je “Top 3” na první pohled (Today pickups/returns/overdue vs revenue vs inventory alerts)?
- **Data density target:** compact jako default pro listy? (ano/ne) + minimální řádková výška
- **Motion ambition:** čistě CSS transitions, nebo Framer Motion pro overlay/sheet? (prefer CSS pro MVP)
- **Dark mode:** first-class hned, nebo “best-effort”? (tokeny jsou připravené, UX rozhodnutí je potřeba)
- **Brand hue:** zůstává teal? (jediná povolená volnost) + kontrola kolize se status-info/success
- **Shadow policy:** shadow-card povolené na dashboardu, nebo border-only i tam?

---

## Plán jak toho docílit (krátce, akčně)

1. Uložit SSOT (`docs/design/*`) + INDEX + PR checklist.
2. Zpřísnit enforcement (zakázané utility + surfaces opacity) s diff-gate.
3. Zavést box komponenty/patterny (Card/TableContainer/InsetBox/StatusCallout/OverlaySurface) a používat je povinně.
4. Zavést motion tokeny + reduce-motion + zakázat attention animace.
5. Dashboard framework: sjednotit widget layout a header pattern, zakázat custom backgrounds.
