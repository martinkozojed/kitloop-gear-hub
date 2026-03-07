# Pain Backlog — Kitloop Pilot (SSOT)

> **Pravidlo:** Implementovat fix jen pokud (a) Blocker, nebo (b) hlášeno u 2+ půjčoven.

| ID | Kategorie | Popis | Frekvence | Půjčovny | Dopad | Stav |
|----|-----------|-------|-----------|----------|-------|------|
| _P-001_ | _speed/error/ux/data/blocker_ | _Co se stalo_ | _1×/opakovaně/vždy_ | _1_ | _blocker/high/medium/low_ | _open_ |

## Jak přidávat

1. Použij další řádek tabulky s novým ID (P-002, P-003...).
2. Kategorie: `speed` (pomalé), `error` (chyba/pád), `ux` (matoucí UI), `data` (špatná data), `blocker` (nelze pokračovat).
3. Po každé pilotní směně projdi a aktualizuj frekvenci + počet půjčoven.

## Vyhodnocení

- **Blocker** → okamžitý fix (nová feature větev).
- **2+ půjčoven** → plánovaný fix (do backlogu s prioritou).
- **1 půjčovna, ne blocker** → sledovat, nefixovat hned.
