# ADR 0003: Linter proti ztrátě dat v migracích (Data-loss Guard)

**Status:** Schváleno
**Datum:** 2026-03-02
**Autoři:** Foundation Audit

## Kontext a Problém

V začátcích vývoje (Supabase) lze lokálně jednoduše zresetovat databázi. Ale protože Kitloop brzy přechází do Pilot režimu s reálnými provozními daty, spuštění migrace typu `DROP TABLE`, smazání klíčového sloupce `DROP COLUMN` nebo plošný `DELETE FROM` (bez modifikátorů) by mohlo způsobit nevratnou ztrátu produkčních dat. Standardní `supabase db push` v CI nemá safemode pro tyto případy.

## Navrhované Řešení

Zavádíme CI skript `prevent-data-loss.sh`.

- Skript pomocí git diff parsuje změny (přidané řádky v `.sql` souborech vůči branchi `main`).
- Vyhledává výskyty slov `DROP TABLE`, `DROP COLUMN`, `TRUNCATE` a rizikové `DELETE FROM`.
- Pokud dojde k detekci, Github Action okamžitě failne celý build a znemožní merge, aby chránila produkční branch.

**Escape Hatch**
Abychom si nezavřeli cestu k cílenému odstraňování dat, lze proces obejít. Do migračního souboru se musí umístit validní direktiva:
`-- data-loss-approved: ADR-XXXX`
která odkazuje na tento nebo jiný schválený ADR dokument projednávající důvody takového zásahu.

## Důsledky

### Pozitiva

- Neexistuje varianta, že nezvkušený vývojář (nebo přehlédnutí při Code Review) tiše zlikviduje data na produkci.
- Povinnost odkazovat data-loss na schválené Release ADR dokumenty kultivuje způsob přemýšlení nad modelem.

### Negativa (Trade-offs)

- Nutnost dodržovat přesný formát únikové direktivy u validních změn.
