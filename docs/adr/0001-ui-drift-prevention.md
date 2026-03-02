# ADR 0001: UI Drift Prevention (Hard Gate)

**Status:** Schváleno
**Datum:** 2026-03-02
**Autoři:** Foundation Audit

## Kontext a Problém

Během MVP fáze a přechodu do pilotu je zásadní udržet konzistenci pojmů (microcopy) a designových tokenů (barvy, stíny, zaoblení). Pokud vývojáři pod tlakem začnou používat hardcoded hodnoty nebo texty místo i18n/registrů, vznikne rychle technologický a UX dluh (UI Drift).

Máme `ui-drift-scan.sh`, ale v CI běžel jen s `continue-on-error: true`, což vedlo k jeho ignorování.

## Navrhované Řešení

Zavádíme **Hard Fail** na UI Drift Scan v GitHub Actions a přidáváme `microcopy-drift-scan.ts`.

1. Pokud CI detekuje nepovolené utility třídy (`text-[...px]`, `shadow-[...]`), pipeline selže.
2. Pokud CI detekuje hardcoded české/anglické klíčové termíny (potvrdit, storno, vydat, uložit) v textových uzlech v kritických cestách (`OnboardingChecklist`, `DashboardOverview`), pipeline selže.
3. Úniková cesta (Escape hatch) je přidání komentáře `// drift-scan:allow <reason>`.

## Důsledky

### Pozitiva

- Vynucená konzistence design systému a klíčové slovní zásoby.
- Mrtvé pojmy (např. "rezervovat" místo "vydat" v backofficu) se do repozitáře přes PR nedostanou.

### Negativa (Trade-offs)

- Občasné falešné detekce u nového kódu, které bude nutné ošetřit komentářem `drift-scan:allow`.
- Mírné zdržení při psaní rychlých prototypů v rámci stávajících souborů.
