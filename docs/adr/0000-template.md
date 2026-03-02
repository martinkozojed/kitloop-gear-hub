# ADR 0000: Název Rozhodnutí

**Status:** Navrženo | Schváleno | Neschváleno | Zastaralé
**Datum:** YYYY-MM-DD
**Autoři:** Jméno Příjmení

## Kontext a Problém (Context)

Stručný popis problému. Proč musíme rozhodovat? Jaký to má dopad? Zmínit omezení a předpoklady. (např. v CI narůstá doba buildu, nebo nemáme přehled o historických datech u rezervací).

## Navrhované Řešení (Decision)

Rozhodli jsme se použít [technologie/postup] a implementovat [konkrétní věc] proto a proto. (např. přidáváme DB Triggery namísto logování z aplikační vrstvy z důvodu datové čistoty bez ohledu na API/UI vstupy).

## Důsledky (Consequences)

Jaký to bude mít objektivní dopad na projekt, vývojáře, nebo systém:

### Pozitiva

- Vyřeší to [P0 úzké hrdlo].
- Lepší DX pro přidávání políček.
- Zvyšuje prokazatelnost transakcí.

### Negativa (Trade-offs)

- Budeme si muset dávat pozor na zátěž DB při hromadných UPDATECH.
- Noví vývojáři musí pochopit kontext tohoto návrhu.

## Alternativy

- Udělat A: Zavrženo protože trvá dlouho a přináší riziko race-cond.
- Udělat B: Zavrženo protože je závislé na 3rd party knihovně, která ztrácí support.
