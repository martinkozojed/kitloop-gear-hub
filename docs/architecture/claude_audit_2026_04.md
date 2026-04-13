# Kitloop Gear Hub — Hloubkový Audit Report (Březen/Duben 2026)

## 1. Co je Kitloop Gear Hub
Kitloop je B2B SaaS platforma pro správu pronájmu outdoorového/sportovního vybavení. Cílí na poskytovatele (půjčovny, kempy, sportovní centra).

(...)
*Zhodnocení provedeno pomocí Claude Code rozšíření. Viz původní report v chatu pro plný detail.*

## Priority pro další vývoj
- PRIORITA 1: Konzolidace API vrstvy (přesunout 47+ přímých Supabase volání do `/src/services/`).
- PRIORITA 2: ErrorBoundary + Sentry produkční setup.
- PRIORITA 3: Odstranění MUI závislosti a sjednocení na Shadcn.
- PRIORITA 4: Rozpad monster komponent (`Index.tsx`, `Onboarding.tsx`).
- PRIORITA 5: E2E test coverage pro bezpečnostní flows.
