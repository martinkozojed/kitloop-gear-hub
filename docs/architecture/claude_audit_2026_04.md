---
verze: 2.0
datum: 2026-04-13
autor: Antigravity
změna: Kompletně přepsán — originální audit priority jsou hotové, dokument aktualizován na post-cleanup stav
nadřazený dokument: strategy/ssot_v1.1.md
---

# Kitloop — Architekturní stav po Cleanup Fázi (Q2 2026)

> **Status:** Aktuální — reflektuje stav po dokončení všech cleanup fází (13. dubna 2026)
> **Nadřazený dokument:** [`../strategy/ssot_v1.1.md`](../strategy/ssot_v1.1.md)

---

## Co bylo uděláno (Duben 2026)

Projekt prošel kompletním architekturním cleanup sprintem realizovaným dual-agentním setupem (Antigravity jako Architekt + Claude Code jako Exekutor s MCP Postgres přístupem).

| Fáze | Co se stalo | Výsledek |
|------|------------|----------|
| **1. DB Reset** | Scorched earth reset lokální Supabase po RLS konfliktech | Čistá DB, testy zelené |
| **2. API vrstva** | `useDashboardData.ts` rozebrán, vytvořen `/src/services/dashboard.ts` | −72 % řádků v hooku |
| **3. Auth/Provider rozpad** | `AuthContext.tsx` (489 ř.) rozbit na `AuthContext` + `ProviderContext` | −186 řádků, SRP dodržen |
| **4. MUI amputace** | Ghost závislosti `@mui/material`, `@emotion/*` odstraněny | −~4 MB bundle |
| **5. ErrorBoundary + Sentry** | Globální záchranná síť, Sentry oživen na 10% telemetrii | Žádná tichá bílá obrazovka |
| **6. Index.tsx demolice** | 842 řádků → 34 řádků wrapper + 6 komponent v `/landing/` | −96 % |
| **7. Onboarding.tsx demolice** | 642 řádků → 146 řádků state machine + 8 komponent v `/onboarding/` | −77 % |
| **8. E2E Playwright test** | Pseudokód nahrazen reálným testem atomicity `issue_reservations_batch` | Zelená, idempotentní |
| **9. Migration Squash** | 133 migračních souborů → 1 baseline `20261029120000_fix_rls_logic.sql` | Čistá DB historie |
| **10. Docs reorganizace** | 63 volných souborů → přehledná struktura s navigačním README | Agent-ready |

---

## Aktuální stav architektury

### Frontend
- **Komponenty:** Modulární. Žádný soubor přes ~40 KB (zbývají `ReservationForm`, `InventoryGrid` — zatím přijatelné).
- **Kontexty:** `AuthContext` (identity), `ProviderContext` (byznys logika provider membership) — oddělené, čisté.
- **Services vrstva:** `/src/services/dashboard.ts` existuje. Ostatní domény (inventory, customers) mají stále přímé Supabase volání v komponentách — kandidát na budoucí cleanup.
- **Závislosti:** Bez MUI/Emotion. Stack = Vite + React + Shadcn + TailwindCSS + React Query + Supabase.

### Backend (Supabase)
- **Migrace:** Jedna baseline migrace (squash ze 133 historických).
- **RLS:** Po scorched earth resetu funkční. Kritické testy zelené.
- **E2E:** Playwright test pokrývá atomicity `issue_reservations_batch` (P0 byznys logika).
- **Monitoring:** Sentry aktivní (10% sample rate), ErrorBoundary obaluje celý strom.

### Dokumentace
- Navigační mapa: [`../README.md`](../README.md)
- Strategický SSOT: [`../strategy/ssot_v1.1.md`](../strategy/ssot_v1.1.md)
- Provozní SSOT: [`../strategy/MVP_SCOPE.md`](../strategy/MVP_SCOPE.md)

---

## Co zbývá (dle strategického SSOT)

Aktuálně jsme na přechodu **Ops OS → White-label Intake (Vrstva B)**. Dle `ssot_v1.1.md` Section 9 (Roadmap framing) jsou dalšími kroky:

1. **Geolokace půjčoven** — základ pro budoucí discovery/directory vrstvu
2. **Veřejný profil půjčovny** — viditelný bez přihlášení
3. **Globální vyhledávač dostupnosti** — datum + lokalita napříč providery

Před každou novou funkcí zkontroluj **Decision checklist** v `ssot_v1.1.md` Section 11.

---

*Poslední aktualizace: 2026-04-13*
