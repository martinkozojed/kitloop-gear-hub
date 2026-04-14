---
verze: 1.0
datum: 2026-04-14
autor: Antigravity + Martin
změna: Kompletní product spec s doplněnými sekcemi (taxonomie, publish mapping, runtime topology, resolution UI, LLM budget, draft persistence)
nadřazený dokument: strategy/ssot_v1.1.md
---

# Smart Inventory Import — Product & MVP Spec

**Status:** Draft v1.0
**User-facing name:** Smart Inventory Import
**Internal name:** Inventory Onboarding Engine
**Owner:** Kitloop
**Feature layer:** Onboarding / Ops foundation

---

## 1) Purpose

Smart Inventory Import pomáhá půjčovnám převést chaotická data z tabulek do použitelného online inventáře během několika minut.

Nejde o "další import". Jde o onboarding engine, který má snížit bariéru přechodu z Excelu, papíru a neformálních procesů do strukturovaného provozního systému Kitloop.

Diferenciace:
1. vezme neorganizovaná data,
2. převede je do provozní pravdy,
3. umožní rychlý start bez perfektních vstupů,
4. vytvoří základ pro další ops workflow,
5. a později i pro white-label intake a marketplace.

> Kitloop neprodává jen software. Prodává okamžitý převod chaosu do použitelného provozního systému.

---

## 2) Strategic context

Smart Inventory Import zapadá do onboarding vrstvy Kitloopu. Jeho role není nahradit core ops funkcionalitu, ale dramaticky zkrátit cestu k ní.

Důležité pro:
- rychlejší akvizici půjčoven,
- vyšší onboarding completion,
- nižší odpor k migraci,
- rychlejší time-to-first-value,
- kvalitnější data pro budoucí marketplace vrstvu.

---

## 3) One-sentence promise

**From Excel to usable online inventory in minutes.**

---

## 4) Problem statement

Typická půjčovna dnes pracuje s daty, která mají několik problémů zároveň:
- data jsou v Excelu nebo CSV bez konzistentní struktury,
- názvy položek jsou nejednotné,
- velikost, typ, množství a poznámky bývají smíchané v jednom poli,
- kategorie nejsou standardizované,
- soubor často není připravený pro import,
- část informací chybí nebo je uložena neformálně,
- různí lidé používají různé zkratky pro totéž.

Běžný importní wizard očekává čistá data. Reálné půjčovny je často nemají.

---

## 5) Iron floor

Řádek může být publikován do inventáře jen tehdy, pokud má:
- **name**
- **quantity**
- **canonical category** (z Kitloop taxonomy)

Vše ostatní je v MVP volitelné: brand, model, size, price_per_day, notes, condition, SKU.

---

## 6) Core principles

### 6.1 Bulk-first, not row-by-row
Hlavní hodnota vzniká v resolution layer. Uživatel řeší většinu nejasností přes skupinová rozhodnutí.

### 6.2 Fixed Kitloop taxonomy
Kitloop má vlastní pevnou taxonomii kategorií. Import nikdy nepublikuje free-text kategorie jako source of truth. Raw label lze uchovat jako alias.

### 6.3 Progressive enrichment
Uživatel nemusí mít perfektní data, aby mohl začít. Detaily se mohou doplnit později.

### 6.4 Iron floor
Minimální datová podlaha, pod kterou systém nesmí jít (viz sekce 5).

### 6.5 Human-in-the-loop
AI a pravidla navrhují. Člověk rozhoduje u nejasností. Systém nesmí potichu publikovat sporné interpretace bez review.

### 6.6 Explainability
Každé doporučení musí být stručně vysvětlitelné. Uživatel rozumí proč je řádek v review.

---

## 7) MVP scope

### Supports
- CSV a XLSX upload
- Výběr sheetu (XLSX)
- Preview dat
- Automatická detekce sloupců
- Normalizace do draft vrstvy
- Mapování do Kitloop taxonomie
- Bucketizace: ready / review / skipped
- Bulk resolution podobných řádků
- Detailní řešení výjimek
- Publish do products → product_variants → assets
- Provider-specific memory
- Publish summary + doporučený další krok

### Does not support
- Více souborů najednou
- PDF import, OCR z fotek
- Automatické zakládání individuálních asset štítků/QR
- Plný variants engine
- Globální knowledge base napříč providery
- Synchronizace proti existujícímu inventáři (merge/update)
- Import rezervací, klientů nebo servisních dat

---

## 8) User flow

### Step 1 — Upload
Uživatel nahraje CSV nebo XLSX. Systém validuje, zobrazí sheety, navrhne nejpravděpodobnější sheet, ukáže preview.

### Step 2 — Mapping review
Systém automaticky odhadne význam sloupců. Uživatel může potvrdit nebo upravit.

### Step 3 — Normalization + Resolution
Systém převede raw rows do draft vrstvy. Každý řádek dostane stav: ready / review / skipped. Resolution obrazovka pracuje primárně se skupinami podobných problémů.

### Step 4 — Publish
Po vyřešení review řádků splňujících iron floor uživatel publikuje. Publish vytváří products → product_variants → assets.

### Step 5 — Publish summary
Kolik položek vytvořeno / přeskočeno / chce doplnění. Primary CTA: Open Inventory. Secondary: Create First Reservation.

---

## 9) Kitloop Taxonomy v0

### Struktura

Každá kanonická kategorie má:
- `activity_family` — hlavní aktivita
- `gear_category` — typ vybavení
- `subtype` (volitelný) — upřesnění
- `size_system` — jaký systém velikostí se používá
- `is_asset_trackable` — má smysl sledovat po kusech
- `requires_condition_tracking` — stav (poškození) je relevantní
- `requires_safety_notice` — bezpečnostní vybavení (helmy, sedáky)

### Taxonomie v0

```
CLIMBING
  climbing / helmet / generic          size: S/M/L    trackable  condition  safety
  climbing / helmet / kids             size: S/M/L    trackable  condition  safety
  climbing / harness / generic         size: XS-XL    trackable  condition  safety
  climbing / harness / via-ferrata     size: XS-XL    trackable  condition  safety
  climbing / ferrata-set / generic     size: one-size trackable  condition  safety
  climbing / carabiner / locking       size: one-size trackable  condition  safety
  climbing / rope / single             size: length-m trackable  condition  safety
  climbing / belay-device / generic    size: one-size trackable  condition  safety

WINTER
  winter / skis / alpine               size: length-cm trackable  condition
  winter / skis / cross-country        size: length-cm trackable  condition
  winter / skis / touring              size: length-cm trackable  condition
  winter / snowboard / generic         size: length-cm trackable  condition
  winter / boots / ski                 size: EU       trackable  condition
  winter / boots / snowboard           size: EU       trackable  condition
  winter / boots / cross-country       size: EU       trackable  condition
  winter / poles / ski                 size: length-cm trackable
  winter / poles / trekking            size: length-cm trackable
  winter / helmet / ski                size: S/M/L    trackable  condition  safety
  winter / goggles / generic           size: one-size trackable
  winter / crampons / generic          size: EU-range trackable  condition

CYCLING
  cycling / bike / mtb                 size: frame    trackable  condition
  cycling / bike / road                size: frame    trackable  condition
  cycling / bike / ebike               size: frame    trackable  condition
  cycling / bike / kids                size: wheel    trackable  condition
  cycling / helmet / generic           size: S/M/L    trackable  condition  safety
  cycling / child-seat / generic       size: one-size trackable  condition  safety

HIKING
  hiking / backpack / daypack          size: liters   trackable
  hiking / backpack / trekking         size: liters   trackable
  hiking / boots / trekking            size: EU       trackable  condition
  hiking / poles / trekking            size: length-cm trackable

CAMPING
  camping / tent / 2p                  size: capacity trackable  condition
  camping / tent / 3-4p               size: capacity trackable  condition
  camping / tent / family              size: capacity trackable  condition
  camping / sleeping-bag / summer      size: S/M/L    trackable  condition
  camping / sleeping-bag / 3-season    size: S/M/L    trackable  condition
  camping / sleeping-bag / winter      size: S/M/L    trackable  condition
  camping / mat / foam                 size: one-size trackable
  camping / mat / inflatable           size: S/M/L    trackable  condition
  camping / stove / generic            size: one-size trackable
  camping / headlamp / generic         size: one-size trackable

WATER
  water / kayak / generic              size: length-m trackable  condition
  water / paddleboard / generic        size: length-ft trackable  condition
  water / paddle / kayak               size: length-cm trackable
  water / paddle / sup                 size: length-cm trackable
  water / lifejacket / generic         size: S/M/L/XL trackable  condition  safety
  water / wetsuit / generic            size: S-XXL    trackable  condition

ACCESSORIES
  accessories / lock / generic         size: one-size
  accessories / rack / car             size: one-size trackable
  accessories / bag / transport        size: liters
  accessories / repair-kit / generic   size: one-size
  accessories / gps / generic          size: one-size trackable  condition
```

### Pravidla

- Uživatel si NIKDY nevytváří vlastní kanonickou kategorii.
- Může mít raw label a provider alias — ale source of truth je Kitloop category ID.
- Pokud systém nerozpozná kategorii → řádek jde do review, uživatel vybírá z dropdownu.
- Taxonomii rozšiřuje pouze Kitloop tým (ne provider, ne AI).
- Taxonomie musí být marketplace-safe: filtrovatelná, groupovatelná, bezpečná pro discovery.

---

## 10) Draft-to-Canonical Mapping

### Draft vrstvy (import-specific)
- `import_jobs` — metadata importu
- `import_files` — reference na upload
- `import_rows` — raw řádky po parsování
- `normalized_inventory_drafts` — kanonický draft po normalizaci
- `import_decisions` — uživatelská rozhodnutí
- `provider_alias_rules` — provider memory

### Publish target (canonical schema)
- `products` — kanonický model vybavení
- `product_variants` — velikost / délka / varianta
- `assets` — jednotlivé kusy

### Mapování

```
normalized_inventory_draft
  → products        (name, category, description, base_price_cents, image_url)
  → product_variants (size/variant info, price_override if different)
  → assets × quantity (auto-generated, status: available)
```

**Quantity → Assets:**
Import z `quantity: 5` vytvoří 5 záznamů v `assets`:
- `asset_tag`: auto-generated (e.g. `IMP-{job_id}-{row}-{seq}`)
- `status`: `available`
- `condition_score`: null (progressive enrichment)
- `tracking_mode`: `untagged` (bez QR/štítku, doplní se později)

**Default variant:**
Když řádek nemá explicitní variantu (velikost, délku), vytvoří se `product_variant` s `name: "default"`. Assety se zavěsí pod ni. Uživatel může později rozdělit na reálné varianty.

**Merge pravidla:**
MVP je **add-only**. Neprovádí merge s existujícím inventářem. Pokud uživatel importuje dvakrát, vytvoří se duplicity — to je vědomé rozhodnutí pro bezpečnost. Merge rules přijdou v další verzi.

---

## 11) Runtime & Processing Topology

### Browser (client)
- Upload souboru
- XLSX sheet selection + preview (lehký parse)
- Základní client validation (file type, size, encoding)
- Resolution UI (vykreslování, posílání decisions)
- Optimistic UI updates

### Server / Edge Function
- Vytvoření import jobu
- Uložení raw rows
- Deterministic normalization (regex, rules, aliases)
- Provider alias aplikace
- LLM enrichment pro nejasné skupiny
- Publish commit (v DB transakci)
- Průběžné ukládání draft state a decisions

### Proč ne browser-only
- Crash ztratí stav
- Velké soubory budou bolet
- LLM klíče patří server-side
- Audit a retry potřebují server-side job
- Publish musí být atomická DB transakce

### Flow

```
Browser                          Server
  │                                │
  ├─ upload file ──────────────────► create import_job
  │                                ├─ store raw file
  │                                ├─ parse → import_rows
  │                                ├─ normalize → drafts
  │                                ├─ group issues
  ◄─ receive draft state ──────────┤
  │                                │
  ├─ user makes decisions ─────────► persist decisions
  │                                ├─ update draft state
  ◄─ receive updated state ────────┤
  │                                │
  ├─ user clicks publish ──────────► validate iron floor
  │                                ├─ create products
  │                                ├─ create variants
  │                                ├─ create assets
  │                                ├─ save alias rules
  ◄─ receive summary ─────────────┤
```

---

## 12) Resolution Engine

### Layout

```
┌─────────────────┬───────────────────────────┬──────────────────┐
│  Issue Groups    │  Selected Group           │  Row Detail      │
│                  │                           │                  │
│  ○ Unknown cat.  │  "25 rows contain 'helma' │  Raw: "Helma S"  │
│  ○ Missing qty   │   but no known category"  │  Proposed: ...   │
│  ○ Size extract  │                           │  Category: ?     │
│  ○ Duplicates    │  Proposed action:         │                  │
│                  │  [Assign: climbing/helmet] │  Undo history    │
│  Ready: 140      │                           │  ─────────────── │
│  Review: 45      │  Affected rows preview    │  Last: merged 3  │
│  Skipped: 5      │  ☑ row 12  ☑ row 15 ...  │  Before: set qty │
│                  │                           │                  │
│                  │  [Apply to all] [Skip]    │                  │
└─────────────────┴───────────────────────────┴──────────────────┘
```

### Issue group typy
- `unknown_category` — nerozpoznaná kategorie
- `missing_quantity` — chybí množství
- `size_extraction` — pravděpodobná velikost v názvu
- `probable_duplicate` — podobné názvy, možný merge
- `mixed_row` — řádek vypadá jako non-inventory (součtový, nadpis)
- `ambiguous_name` — název lze interpretovat více způsoby

### Typy akcí
- Apply category to all in group
- Apply default quantity to all
- Split name into product + variant/size
- Merge similar rows under one product
- Mark group as skipped
- Manual edit single row (fallback)

### Pravidla
- Každé rozhodnutí je reversibilní (undo)
- Každý návrh vysvětluje PROČ
- Bulk first, row detail second
- Žádný spreadsheet editing jako primární mód
- Progress bar: kolik review groups zbývá

---

## 13) LLM Usage Policy

### Co LLM smí
- Rozpoznání významu hlaviček
- Návrh kanonické kategorie
- Extrakce velikosti z nejednoznačného názvu
- Vysvětlení proč je řádek v review
- Groupování podobných problémů

### Co LLM nesmí
- Sama publikovat data bez review
- Vytvářet volné taxonomické větve
- Měnit existující inventory truth
- Být jedinou logikou pro běžné rozpoznatelné případy

### Processing order
1. Deterministic parsing
2. Header heuristics
3. Regex / rules
4. Provider alias rules
5. LLM fallback na nejasné SKUPINY (ne per-row!)
6. Review bucket pokud stále není jistota

### Budget & latence (MVP)

- LLM se volá na **group-level**, ne per-row
- 500 řádků → po deterministic fázi ~20-40 nejasných skupin → 20-40 LLM calls
- Model: Claude Haiku nebo ekvivalent (rychlý, levný)
- Max tokens per call: ~500 input + ~200 output
- Hard timeout: 10s per call
- Budget ceiling: ~$0.50 per import (well under $1)
- **Fallback bez LLM**: pokud LLM nedostupné nebo timeout → řádky jdou do review bez AI návrhu. Import MUSÍ projít i v degradovaném režimu.
- Output: vždy structured JSON

---

## 14) Draft Persistence

Draft state se ukládá **průběžně do DB**, ne jen do browser memory.

### Co se persistuje
- Import job: ihned po uploadu
- Raw rows: ihned po parsování
- Normalized drafts: ihned po normalizaci
- Každé bulk rozhodnutí: ihned po aplikaci
- Alias rules: ihned po potvrzení

### Crash recovery
Po návratu uživatel vidí:
- Poslední krok kde skončil
- Počet zbývajících review groups
- Historie posledních rozhodnutí
- Možnost pokračovat nebo restartovat

### UX pravidlo
Žádná práce se nikdy neztratí bez varování. Browser může spadnout, tab se může zavřít — stav je v DB.

---

## 15) Critical states

### Error
Jasná červená, vždy s popisem příčiny. Co se stalo + co udělat dál. Nikdy prázdná stránka.

### Empty file / no usable data
"Soubor neobsahuje použitelná data. Zkontrolujte formát." + odkaz na příklad souboru.

### All rows skipped
"Žádný řádek nesplňuje minimální požadavky. Chybí název, množství nebo kategorie." + možnost vrátit se do resolution.

### LLM failure
Tiché degradování — řádky jdou do review bez AI návrhu. Žádný error dialog.

### Large file
Nad 1000 řádků: "Soubor je velký, zpracování může trvat déle." + progress indicator.

---

## 16) Variants and size handling

### MVP rule
MVP nemusí zavádět plný variants engine, ale musí umožnit alespoň:
- Rozpoznat pravděpodobný size/variant atribut v názvu
- Nechat uživatele potvrdit zda jde o název nebo variantu
- Nabídnout lehké seskupení podobných řádků pod společný product
- Zachovat cestu k budoucí variantní architektuře

### Příklady
- "Lyže 160 cm" a "Lyže 170 cm" → 1 product, 2 varianty
- "Boty 42" a "Boty 27.5 MP" → nabídnout grouping
- "Helma S/M" → 1 product, 1 varianta (S/M jako size)

---

## 17) Provider memory

Základní provider-specific memory je součástí MVP.

Systém si pamatuje:
- Lokální aliasy kategorií ("H" = helmet)
- Opakující se zkratky ("FS" = ferrata set)
- Patterny velikostí
- Preferované mapování konkrétní půjčovny

Scope: memory je **lokální pro konkrétního providera**. Globální knowledge base je budoucí vrstva.

---

## 18) Data model

### import_jobs
`id`, `provider_id`, `status` (uploading / processing / resolving / publishing / completed / failed), `source_type` (csv/xlsx), `selected_sheet_name`, `total_rows`, `ready_count`, `review_count`, `skipped_count`, `created_by`, `created_at`, `completed_at`

### import_files
`id`, `import_job_id`, `storage_path`, `original_filename`, `mime_type`, `file_size`

### import_rows
`id`, `import_job_id`, `row_index`, `raw_payload_json`, `raw_text_snapshot`

### normalized_inventory_drafts
`id`, `import_job_id`, `import_row_id`, `status` (ready/review/skipped), `proposed_name`, `proposed_category_id`, `proposed_quantity`, `proposed_size`, `proposed_price_per_day`, `proposed_notes`, `issue_codes[]`, `explanation`, `group_key`, `user_confirmed_fields_json`

### import_decisions
`id`, `import_job_id`, `decision_type`, `applied_to_group_key`, `payload_json`, `created_by`, `created_at`, `reverted_at`

### provider_alias_rules
`id`, `provider_id`, `rule_type`, `source_pattern`, `mapped_value`, `created_from_import_job_id`, `confidence_level`

---

## 19) Non-goals

Explicitně NE pro MVP:
- OCR z fotek nebo PDF
- Asset-by-asset import s QR/štítky
- Plný katalogový/ERP engine
- Import rezervací nebo zákazníků
- Plně autonomní AI import bez kontroly
- Sync s konkurenčním softwarem
- Generátor veřejného katalogu

---

## 20) Edge cases

MVP musí počítat s:
- Více možných header řádků
- Prázdné řádky a sekční nadpisy
- Součtové řádky
- Ceny v textu
- Quantity schované v názvu
- Mixed size notation
- Stejné položky napsané různě
- Řádky které jsou spíš ceník než inventář
- Duplicitní import stejného souboru
- Soubor bez použitelného quantity pole
- Příliš velký XLSX (limit: 5000 řádků, 10MB)

---

## 21) Success metrics

- Upload → publish time
- Completion rate import flow
- % rows auto-ready
- % rows resolved via bulk decisions
- % rows skipped
- First reservation created after import
- Repeated issue patterns by category

Target: většina běžných importů dokončena v jednotkách minut. Resolution výrazně kratší než ruční přepis.

---

## 22) Acceptance criteria

MVP je hotové pokud:
1. Uživatel může nahrát CSV/XLSX a vybrat sheet.
2. Systém automaticky navrhne význam běžných sloupců.
3. Data se převedou do draft vrstvy bez přímého zápisu do inventáře.
4. Každý draft row skončí v ready, review nebo skipped.
5. Review rows lze řešit bulk rozhodnutími.
6. Publish pustí jen rows splňující iron floor.
7. Publish vytváří products → product_variants → assets.
8. Provider alias rules se ukládají.
9. Uživatel po publishi dostane summary a může pokračovat do inventáře.

---

## 23) Release guardrails

Před releasem musí platit:
- Pevná taxonomie implementovaná
- Draft layer povinná
- Add-only publish semantics
- Provider memory lokální, ne globální
- Neexistuje cesta která publikuje free-text kategorie
- Resolution flow je použitelný bez row-by-row editace
- Systém umí bezpečně selhat a vrátit čitelnou chybu
- LLM failure nezablokuje import

---

## 24) Risks

| Riziko | Mitigace |
|--------|----------|
| Taxonomy fragmentation | Fixed taxonomy, no free-text publish |
| Variant ambiguity | Size extraction + user confirmation |
| Resolution becomes manual labor | Bulk-first UX, grouped issues |
| Over-trust in AI | Human-in-the-loop, explanations |
| Duplicate inventory | Add-only publish, warning on re-import |
| Performance bottlenecks | Server-side processing, file size limits |

---

## 25) Open questions

1. Taxonomie v0 (navržená výše) — je kompletní pro pilotní půjčovny?
2. Jak hluboko variants-lite v MVP? (navrženo: basic size extraction + grouping)
3. Maximální velikost souboru? (navrženo: 5000 řádků, 10MB)
4. Které alias rules se ukládají automaticky vs po explicitním potvrzení?
5. Jaké kategorie outdoor inventáře budou v první verzi prioritní?

---

*Tento dokument nahrazuje SMART_ONBOARDING_v0.2.md (přesunuto do history/). Konkrétní implementační kroky jsou v backlogu, ne zde.*
