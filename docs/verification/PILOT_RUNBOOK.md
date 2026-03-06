# Pilot Runbook (F1 Execution)

## Cíl a Kontext

1-stránkový manuál pro **F1 Pilot Execution (Shadow Mode)**. Cílem této fáze není kompletní nasazení do operativy, ale "shadow mode" (stínový běh) s reálnými daty. Pilotní půjčovna projde procesem inventář → rezervace → výdej → vrácení alespoň 5× napříč dny. Zjišťujeme, kde Kitloop pult zpomaluje a logujeme Friction (bolest).

## GO/NO-GO Checklist pro spuštění pilota

Před zahájením provozu s půjčovnou v režimu stínu je nutné ověřit následující:

- [ ] **Onboarding & Import**: Počáteční import je dokončen (< 15 minut) pomocí progresivního wizardu.
- [ ] **Data Integrity**: Databáze bez chyb a selhání při Approval/Issue/Return flow. Hard gate funguje.
- [ ] **Performance (Peak Mode)**: Systém poskytuje rychlou odezvu při přepínání zobrazení na pultu.
- [ ] **Telemetry & Audit**: Události typu `reservation_created`, `issue_completed`, `return_completed` plně trackovány v systému.
- [ ] **Pain Tagging Prepared**: Šablona backlogu je plně připravena a dostupná.

## Měřené Metriky v průběhu

- **TTFV (Time to first value)**: Od loginu k prvnímu úspěšnému výdeji ≤ 30 min (cíl pro pilot).
- **Issue Median Time**: Bez hledání cílově < 60 s.
- **Return Median Time**: Cílově < 60 s.
- **Operational Integrity**: 0 kritických failů v core flow (approval/issue/return/print/export).

## Zápis Friction & Pain do Backlogu

Zpětná vazba na rychlost se zapisuje do Pain Listu s těsným tagováním:

- **Blocker**: Úkon se zasekl a musel se použít papír. (Vyžaduje okamžitý hotfix).
- **Friction**: Půjčovna narazila na místo, kde musela moc klikat (UX drift) nebo kde chybí shortcuty.
- **Feature gap**: Očekávaná položka, ale momentálně OUT OF SCOPE (zapisuje se do backlogu do další fáze - F2/F4/F5+).

### Akční postup pro support

Pokud dojde k problému, nepokoušejte se rozšiřovat moduly ani scope Kitloopu o nové sekce. Zaměřte se výlučně na vyřešení friction v `ops` jádru.
