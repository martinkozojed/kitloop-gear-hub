# Architecture Decision Records (ADR)

Tato složka uchovává historicky důležitá inženýrská rozhodnutí, která ovlivňují architekturu, data model, nebo způsob práce v repozitáři Kitloop.
Záznamy jsou neměnné (append-only) – pokud se rozhodnutí změní, vytvoří se nové ADR, které nahrazuje staré.

## Kdy vyžadujeme zápis ADR?

ADR je **povinné** sepsat, pokud PR obsahuje jakoukoliv z těchto změn:

1. **Destruktivní úpravy schématu (Data-loss)**, například `DROP TABLE` nebo smazání klíčového sloupce. Tyto migrace v CI narazí na náš linter a pro jejich projití musí do kódu migrace přibýt tag `-- data-loss-approved: ADR-XXXX`.
2. **Rozšíření business logiky nebo hranic systému** (např. přidání veřejných stránek do původně čistě privátního admin systému).
3. **Přidání nové kritické služby / 3rd party API** (Stripe, Resend, Sentry).
4. **Rozšíření core datového modelu o nové kanonické tabulky**, které definují stav aplikace (např. platby, outbox eventy).

## Návod

Zkopírujte `0000-template.md`, uveďte číslo (000X) a pojmenujte soubor malými písmeny s pomlčkami, např. `0004-stripe-payments-integration.md`.
