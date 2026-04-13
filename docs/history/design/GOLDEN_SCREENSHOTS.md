# Golden Screenshots — Expected Look (Reference)

> Referenční „expected look“ pro pilot-ready ověření. Ne design assety — **vizuální důkaz**, když někdo tvrdí „tak to bylo vždycky“.

Přidej sem odkazy na screenshoty (nebo ulož obrázky do `docs/design/screenshots/` a odkaž je níže). Při změně layoutu nebo SSOT aktualizuj screenshoty.

---

## 1. Dashboard (KPI + Today + Overdue)

**Očekávaný vzhled:**

- 12-col grid; řada 1: KPI cards (stejná výška), řada 2: Today lists/tables + side panel (Overdue/Alerts).
- Každý widget = Card (`bg-card` + `border border-border`); volitelně `shadow-card`.
- Header: title vlevo, jedna akce vpravo.
- Žádné custom backgrounds widgetů; statusy přes badges/callouts.

**Screenshot:** _[přidej `screenshots/dashboard.png` nebo odkaz na wiki]_

---

## 2. Reservations list (table container + thead bg-muted + row hover)

**Očekávaný vzhled:**

- Tabulka v `bg-card` containeru s `border border-border rounded-md overflow-hidden`.
- Thead vždy `bg-muted`.
- Row hover = `bg-accent`; focus = `ring-ring`.

**Screenshot:** _[přidej `screenshots/reservations-list.png` nebo odkaz na wiki]_

---

## 3. Issue/Return dialog (bg-popover + shadow-elevated + status callout)

**Očekávaný vzhled:**

- Overlay = `bg-popover` + `border border-border` + `shadow-elevated`.
- Warning/info bloky = status soft pattern (`bg-status-warning/10` + `border border-status-warning/20`), ikony `text-status-warning`.
- Žádný blur v ops.

**Screenshot:** _[přidej `screenshots/issue-return-dialog.png` nebo odkaz na wiki]_

---

## Použití

- **Pilot-ready / release:** porovnej aktuální UI s těmito referencemi (grayscale + focus walk doplňuje [docs/verification/ui_smoke.md](../verification/ui_smoke.md)).
- **Spory o „expected look“:** odkaz na tento dokument a příslušný screenshot jako důkaz.
