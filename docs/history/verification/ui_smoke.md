# UI Smoke Checklist (Pilot-Ready Verification)

> Krátký manuální checklist pro ověření UI podle SSOT. Hodí se pro pilot-ready stejně jako e2e testy. Projděte před release nebo po větších UI změnách.

---

## F4 accept (5 min, povinné pro „provider ops locked“)

Pro formální uzavření F4 projděte v tomto pořadí:

1. **Reservations list** — tabulka v `bg-card` containeru, thead `bg-muted`, row hover `bg-accent`.
2. **InventoryGrid + status pills** — Inventory stránka; status badges pouze přes tokeny (žádné ad-hoc emerald/amber).
3. **Issue/Return + Scanner/Handover** — dialogy bez `border-0`/`shadow-2xl`; overlay = border + shadow-elevated; status callout = soft pattern.
4. **1 alert** — conflict nebo validation (např. ResolveConflictModal / ReservationForm error); barvy jen přes status tokeny.
5. **Focus walk (Tab)** — focus ring jednotně `ring-ring`; žádný skrytý focus.
6. **Grayscale Achromatopsia** — Chrome DevTools → Rendering → Emulate vision deficiency → Achromatopsia; karty a statusy čitelné bez barvy.

Když všech 6 bodů projde, odškrtni je (v PR popisu nebo v plánu SSOT implementace) a F4 lze formálně uzavřít: **F4 CLOSED ✅ (provider/operations)**.

---

## 1. Grayscale test

- **Nástroj:** Chrome DevTools → Rendering → Emulate vision deficiency → Achromatopsia.
- **Kde:** Dashboard, Reservations list, Issue/Return dialog.
- **Očekávání:** Card containers jasně oddělené od canvas; status badges čitelné i bez barvy (kontrast / tvar).

---

## 2. Focus walk

- **Jak:** Tab přes hlavní flow (navigace, formuláře, tabulka, dialog).
- **Očekávání:** Focus ring jednotně `ring-ring` (brand teal) všude; žádný `ring-primary` ani skrytý focus.

---

## 3. Table container rule

- **Kde:** Reservations list, Accounts, Customers (všechny tabulky v provider).
- **Očekávání:** Tabulka vždy v `bg-card` containeru s `border border-border` a `overflow-hidden`; thead vždy `bg-muted`. Žádná tabulka přímo na canvas.

---

## 4. Status patterns

- **Kde:** Badges v tabulkách; warning/info bloky v Issue/Return.
- **Očekávání:** Pouze 3 patterny (soft / solid / outline) s `--status-*` tokeny; žádné ad-hoc `bg-amber-*`, `bg-emerald-*`. Soft callout = `bg-status-*/10` + `border border-status-*/20`.

---

## Provider scope report (metriky)

- **Příkaz:** `npm run report:ui -- --provider`
- **F4 accept podmínka:** V výstupu musí být **0** u „Surface opacity“ a **0** u „Ad-hoc status (amber/emerald/…)“ v rámci provider/ops scope. Trend hlídat (nesmí růst).

---

## Reference

- SSOT: [docs/design/INDEX.md](../design/INDEX.md), [PR_CHECKLIST_UI.md](../design/PR_CHECKLIST_UI.md)
- Golden screenshots (expected look): [docs/design/GOLDEN_SCREENSHOTS.md](../design/GOLDEN_SCREENSHOTS.md)
