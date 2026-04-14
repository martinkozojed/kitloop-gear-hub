# Kitloop Docs — Navigační mapa

> **Pro agenty:** Čti tento soubor jako první. Obsahuje mapu živých dokumentů.
> Vše ostatní mimo níže uvedené sekce je historický archiv v `docs/history/`.
> **Pravidla pro dokumentaci:** [`CONTRIBUTING.md`](CONTRIBUTING.md)

---

## Živé dokumenty (platné, čti před prací)

### Strategie
| Soubor | Obsah | Kdy číst |
|--------|-------|----------|
| [`strategy/ssot_v1.1.md`](strategy/ssot_v1.1.md) | Strategický SSOT — North Star, vrstvy produktu, monetizace, roadmapa, non-negotiables | Vždy před novou funkcí nebo rozhodnutím |
| [`strategy/MVP_SCOPE.md`](strategy/MVP_SCOPE.md) | Provozní SSOT — co je MVP, hranice produktu, status stroje, security guardrails | Před každou změnou v ops vrstvě |
| [`strategy/brand_manual_v2.md`](strategy/brand_manual_v2.md) | Brand manual — barvy, typografie, surfaces, motion, komponenty, dark mode, tokeny | Před každou UI/design změnou |
| [`strategy/smart_inventory_import.md`](strategy/smart_inventory_import.md) | Smart Inventory Import — product spec, taxonomie, data model, resolution engine, runtime | Před prací na import feature |

### Architektonická rozhodnutí (ADR)
| Soubor | Obsah |
|--------|-------|
| [`adr/0001-ui-drift-prevention.md`](adr/0001-ui-drift-prevention.md) | Prevence UI driftu |
| [`adr/0002-append-only-audit-log.md`](adr/0002-append-only-audit-log.md) | Audit log architektura |
| [`adr/0003-data-loss-guard.md`](adr/0003-data-loss-guard.md) | Data loss ochrana |

### Ops & Provoz
| Soubor | Obsah | Kdy číst |
|--------|-------|----------|
| [`ops/OPERATIONS.md`](ops/OPERATIONS.md) | Hlavní vstupní bod pro produkční operace | Před deployem |
| [`ops/RUNBOOK.md`](ops/RUNBOOK.md) | Konkrétní příkazy — bootstrap, incident, rollback | Při incidentu |
| [`ops/feature_flags.md`](ops/feature_flags.md) | Aktivní feature flagy | Před změnou chování funkce |
| [`ops/PAIN_BACKLOG.md`](ops/PAIN_BACKLOG.md) | Backlog bolestivých míst | Při plánování sprintu |
| [`ops/pilot_playbook.md`](ops/pilot_playbook.md) | Pilot playbook — switch-over, data check, go-live | Před pilotem |
| [`ops/microcopy_v1_pilot.md`](ops/microcopy_v1_pilot.md) | In-app microcopy registr — vocabulary, tóny, copy rules | Při psaní UI textů |

### Architektura
| Soubor | Obsah |
|--------|-------|
| [`architecture/claude_audit_2026_04.md`](architecture/claude_audit_2026_04.md) | Audit Q1/Q2 2026 — priority pro vývoj, výsledky cleanup fáze |

---

## Struktura složek

```
docs/
├── README.md               ← tento soubor (čti první)
├── strategy/               ← živá strategická rozhodnutí
│   ├── ssot_v1.1.md        ← STRATEGICKÝ SSOT (North Star, vrstvy, monetizace)
│   ├── MVP_SCOPE.md        ← PROVOZNÍ SSOT (hranice MVP, guardrails)
│   ├── brand_manual_v2.md  ← BRAND MANUAL (design systém, tokeny, motion)
│   └── smart_inventory_import.md ← SMART IMPORT (product spec, taxonomie)
├── adr/                    ← Architecture Decision Records (neměnné)
├── architecture/           ← technické audity a analýzy
├── ops/                    ← provozní dokumenty (runbooky, feature flagy)
└── history/                ← archiv (zastaralé reporty, staging evidence, P0 logy)
```

---

## Co je v archivu (`docs/history/`)

Vše v `history/` jsou historické záznamy z vývoje (P0 reporty, staging evidence, debug logy, verification reports). Jsou čitelné pro kontext, ale **nejsou závazné pro aktuální stav produktu**.

Migrace DB jsou zálohovány v `history/migrations_backup_2026/`.

---

*Poslední aktualizace: 2026-04-14*
