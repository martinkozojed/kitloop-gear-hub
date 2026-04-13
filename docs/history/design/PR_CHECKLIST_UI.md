# PR Checklist — UI / Design System

> Short checklist for reviewers. Tick before approving UI-related changes.

---

## Checklist (6 points)

- [ ] **Surfaces:** Only 5 roles (`bg-background`, `bg-card`, `bg-popover`, `bg-muted`, `bg-accent`); **no opacity** on surfaces (no `bg-muted/50`, `bg-card/50`, etc.).
- [ ] **Card / Table containers:** Border-first — always `border border-border`; table in `bg-card` container with `overflow-hidden`; thead stays `bg-muted`.
- [ ] **Status:** Only 3 patterns (soft / solid / outline) with `--status-*` tokens; no ad-hoc `bg-amber-*`, `bg-emerald-*`, etc.
- [ ] **Focus:** Focus ring unified — `ring-ring` (or outline-ring); no `ring-primary`.
- [ ] **Table:** Table always inside `bg-card` container; thead always `bg-muted`.
- [ ] **Overlay:** Popover/dialog = `bg-popover` + `border border-border` + `shadow-elevated`; no blur in ops.

---

## If lint changed…

Každá změna v **scripts/lint-hardcoded-colors.sh** musí mít v **tom samém PR**:

- [ ] **ENFORCEMENT.md** — doplněn jeden odstavec: co přibylo / ubylo (zakázané patterny).
- [ ] **DESIGN_TOKENS.md** (docs/design) — pokud se změna dotýká surfaces/status: aktualizována tabulka Allowed/Forbidden.

Seznam zakázaných patternů drž v sync v [ENFORCEMENT.md](./ENFORCEMENT.md) (blok „Zakázané patterny (zrcadlo lintu)“). Přidáš pattern do lintu → přidáš řádek do seznamu.

---

## Quick refs

- Surfaces & status: [DESIGN_TOKENS.md](./DESIGN_TOKENS.md)
- Boxes: [BOX_PATTERNS.md](./BOX_PATTERNS.md)
- Effects: [EFFECTS_TOKENS.md](./EFFECTS_TOKENS.md)
- Motion: [MOTION_TOKENS.md](./MOTION_TOKENS.md)
- Dashboard: [DASHBOARD_PATTERNS.md](./DASHBOARD_PATTERNS.md)
- Lint: `npm run lint:colors` (diff-gated; [scripts/lint-hardcoded-colors.sh](../../scripts/lint-hardcoded-colors.sh))
