# Enforcement — Design System

> Jak se hlídá dodržování SSOT.

**Lint rules source of truth = `scripts/lint-hardcoded-colors.sh`.** Při každé změně lintu musí v tom samém PR dostat update tento dokument (ENFORCEMENT.md) a případně DESIGN_TOKENS.md — viz [PR_CHECKLIST_UI.md](./PR_CHECKLIST_UI.md) sekce „If lint changed…“.

---

## Zakázané patterny (zrcadlo lintu — drž v sync)

Jedno místo pravdy je skript; tento seznam slouží k rychlému přehledu a k vynucení „přidáš pattern do lintu → přidáš řádek sem“.

- Hex/rgba v TS/TSX (kromě povolených souborů: index.css, tailwind.config.ts, DESIGN_TOKENS.md, theme, telemetry)
- `bg-slate-*`, `bg-gray-*`, `text-slate-*`, `text-gray-*`, `border-slate-*`, `border-gray-*`
- `text-amber-*`, `bg-amber-*`, `text-emerald-*`, `bg-emerald-*` (použij `bg-status-*` / `text-status-*`)
- `ring-primary` (použij `ring-ring`)
- Surface opacity: `bg-muted/[0-9]+`, `bg-card/[0-9]+`, `bg-background/[0-9]+`, `bg-popover/[0-9]+`, `bg-accent/[0-9]+` (povoleno: `bg-status-*/10`, `bg-brand/10`)
- V `src/pages/provider/`: `bg-white`, `shadow-sm` (použij `bg-card`, `shadow-card`); `variant="marketing"` (povoleno jen na public stránkách → fail)

---

## Lint script (diff-gated)

- **Spuštění:** `npm run lint:colors` → `scripts/lint-hardcoded-colors.sh`
- **Diff-gate:** Skript bere pouze **změněné soubory** oproti `origin/main` (`git diff --name-only origin/main...HEAD`). Nové porušení v nezměněných souborech se nehlásí; při zásahu do souboru s porušením oprav pouze dotčenou část.

---

## Co lint kontroluje (soulad s SSOT)

| Kontrola | Pravidlo | Příklad zakázaného |
|----------|----------|---------------------|
| Hex/rgba | Žádné `#hex` ani `rgba()` v TS/TSX | `#2E7D32`, `rgba(0,0,0,0.1)` |
| Povolené soubory pro hex/rgba | index.css, tailwind.config.ts, DESIGN_TOKENS.md, theme, telemetry | — |
| Surfaces | Žádné `bg-slate-*`, `bg-gray-*` | `bg-slate-100` |
| Status | Žádné ad-hoc `text-amber-*`, `bg-amber-*`, `text-emerald-*`, `bg-emerald-*` | Použij `bg-status-*` / `text-status-*` (enforcement je **review-level** + helpery, ne lint — viz níže) |
| Focus | Žádné `ring-primary` | Použij `ring-ring` |
| Opacity na plochách | Žádné `bg-muted/50`, `bg-card/50`, `bg-background/50`, `bg-popover/50`, `bg-accent/50` | Opacity povolena jen u `bg-status-*`, `bg-brand*`; **zákaz neblokuje** `bg-status-*/10` (soft varianta) — lint kontroluje jen surface tokeny. |
| Provider stránky | V `src/pages/provider/` žádné `bg-white`, `shadow-sm` | Použij `bg-card`, `shadow-xs` / `shadow-card` |

**Výjimky (skip):** `DESIGN_TOKENS.md`, `docs/design/*.md`, `scripts/lint-hardcoded-colors.sh` (dokumentace obsahuje příklady zakázaných patternů).

**Status enforcement:** Není v lintu (ad-hoc amber/emerald ano). Dodržování 3 status patternů a použití pouze helperů (`getStatusColorClasses`, Badge varianty) se hlídá **review-level** — [PR_CHECKLIST_UI.md](./PR_CHECKLIST_UI.md).

---

## Co lint nekontroluje (TODO)

- **Motion:** Lint je volitelné; pokud se zapne, zakazuje `animate-bounce`, `animate-ping` a nekonečné animace. Zatím jen review (PR checklist).
- **Box varianty:** Žádný automatický check na „povolené typy boxů“ — spoléháme na [PR_CHECKLIST_UI.md](./PR_CHECKLIST_UI.md) a BOX_PATTERNS.

---

## PR review

Vždy pro UI změny projít [PR_CHECKLIST_UI.md](./PR_CHECKLIST_UI.md) (6 bodů). Lint je první brzda; checklist pokrývá pravidla, která lint neřeší.

**Volitelně:** V `.github/CODEOWNERS` přidat **pouze** `docs/design/**` (SSOT dokumenty) s přiřazeným design gatekeeperem — ne pro celý UI kód. Udrží to rychlost vývoje a zároveň ochrání pravidla.

---

## Provider scope report (F4 accept / freeze guardrails)

- **Příkaz:** `npm run report:ui -- --provider`
- **Scope:** src/pages/provider, src/components/provider, src/components/operations, src/components/dashboard, src/components/crm, src/components/reservations.
- **F4 CLOSED ❌** dokud report nemá **0** u „Surface opacity“ a **0** u „Ad-hoc status“. **F4 CLOSED ✅** až po 0/0 (+ ui_smoke F4 accept). Skript jen reportuje (CI nefailuje).
- **Výstup:** Kategorie + top files s počty; u ad-hoc status navíc **pattern groups** (bg-amber-*, text-emerald-*, …), aby bylo jasné, co nahradit.
- **Freeze:** Trend v provider scope nesmí růst; zbytek (public/admin) = samostatný backlog.
- **F4 follow-up:** Zbývající výskyty v ReservationCalendar + ReservationDetailSheet → jeden PR „F4 follow-up: status tokens“, před merge 0/0 + ui_smoke. Viz plán implementace SSOT (F4 follow-up).
