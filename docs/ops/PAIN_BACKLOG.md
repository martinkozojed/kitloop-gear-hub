# Pain Backlog — Kitloop Pilot (SSOT)

> **Pravidlo:** Implementovat fix jen pokud (a) Blocker, nebo (b) hlášeno u 2+ půjčoven.

| ID | Kategorie | Popis | Frekvence | Půjčovny | Dopad | Stav |
|----|-----------|-------|-----------|----------|-------|------|
| P-001 | data | Reservation form nabízí vybavení (produkty), i když inventář je prázdný — nemělo by nic nabídnout | vždy | 1 | high | open |
| P-002 | ux | Date pickery ve formuláři rezervace vypadají zastarale, nezapadají do UI systému | vždy | 1 | medium | open |
| P-003 | ux | Glow efekty na stránkách jsou useknuté (oříznuté overflow) | vždy | 1 | low | open |

## Jak přidávat

1. Použij další řádek tabulky s novým ID (P-002, P-003...).
2. Kategorie: `speed` (pomalé), `error` (chyba/pád), `ux` (matoucí UI), `data` (špatná data), `blocker` (nelze pokračovat).
3. Po každé pilotní směně projdi a aktualizuj frekvenci + počet půjčoven.

## Vyhodnocení

- **Blocker** → okamžitý fix (nová feature větev).
- **2+ půjčoven** → plánovaný fix (do backlogu s prioritou).
- **1 půjčovna, ne blocker** → sledovat, nefixovat hned.
