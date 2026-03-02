# ADR 0002: Databázové Audit Logy pro klíčové entity

**Status:** Schváleno
**Datum:** 2026-03-02
**Autoři:** Foundation Audit

## Kontext a Problém

Systém Kitloop odbavuje fyzický inventář a jeho výdej (půjčovny). Pokud vznikne spor (např. rezervace najednou zmizela, nebo se změnil stav kusu z "available" na "maintenance"), administrátor půjčovny nemá jak zjistit, KDO a KDY z jeho personálu změnu provedl. Sentry a frontend telemetrie to neřeší komplexně (pokrývají jen chyby a UI flows, ne přímá DB volání nebo API manipulace).

## Navrhované Řešení

Implementovat tabulku `provider_audit_logs` a PostgreSQL Triggery zachytávající akce typu `INSERT`, `UPDATE` a `DELETE`.
Cílem jsou zatím pouze nejdůležitější tabulky:

- `reservations`
- `gear_items`

Ukládá se JSON payload `old_data` a `new_data`.
Ošetřeno před RLS Bypass zápisem (`SECURITY DEFINER` ve `fn_audit_trigger`), ale se zachováním `auth.uid()` coby `actor_id`.

## Důsledky

### Pozitiva

- Odolnost proti modifikacím přes aplikační kód; trigger funguje přímo na databázi.
- Prokazatelná a nesmazatelná historie ("append-only") zásahů do klíčových business entit pro případ reklamace.

### Negativa (Trade-offs)

- Zvýšené nároky na velikost databáze (tabulka logů rychle poroste). Někdy v budoucnu bude nutné zavést retention politiku (např. automatické smazání po 90 dnech).
- Malý performance hit při každém zápisu/aktualizaci kvůli trigger invocation. Pro MVP workload to není problém.
