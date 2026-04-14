# Smart Onboarding Engine (PRD v0.2)

## Hlavní produktová teze (North Star)
> **"Kitloop neprodává software, prodává okamžitý převod chaosu do provozní pravdy přes fixní kanonický model."**

Tento dokument slouží jako detailní Implementační PRD (Product Requirements Document) pro "Canonical Inventory Ingestion System".

---

## 1. Cíl (Promise)
*"Nahrajte běžný soubor. Kitloop jej převede do online inventáře podle fixní Kitloop taxonomie. Nejasnosti vyřešíte rychle přes dávkové návrhy. Výsledek je hned použitelný pro rezervační proces."*

Cílem není narvat špinavá data do systému, ale **normalizovat je do striktní Kitloop logiky**, aniž by to uživatele bolelo a zdržovalo.

## 2. Iron Floor (Tvrdé minimum)
Nenecháme uživatele importovat neužitečný bordel. Funkce "Progressive Structuring" má pevné dno. Do produkční rezervační databáze se neuloží nic, co nesplní tyto **3 Mandatory Fields**:
1. **Název** (člověkem čitelný identifikátor)
2. **Množství (Quantity)**
3. **Kanonická Kategorie** (Pevný nod v Kitloop Taxonomickém stromu)

Vše ostatní (velikost, cena, značka, stav) je progressive enrichment a může se doladit později operativně.

## 3. Pevná Kitloop Taxonomie (Záchrana Marketplacu)
Volné "uživatelské" kategorie jsou absolutně zakázány jako Primary Source of Truth.
- Každý surový řádek (raw label) musí být LLM systémem přemapován na náš strom (např. `Snowboardy > Freeride`).
- Pokud systém neví, řádek čeká na ruční zařazení. Uživatel si volí z našeho Dropdownu, nikoliv textového pole.
- Původní název/slang poskytovatele uložíme pouze jako `provider_alias` pro referenci a vyhledávání.

## 4. Resolution UX (Hlavní nástroj)
Srdcem produktu není Upload, ale **Resolution Engine**. Ten nesmí působit jako tabulkový editor, ale jako rychlý dávkový schvalovač. 

Obrazovka pro Resolution má 3 vrstvy:
1. **Auto-approved groups:** *"Těchto 140 řádků jsme pochopili plně."* (Stačí odkliknout).
2. **Needs one decision (Bulk-first):** *"Těchto 25 položek obsahuje slovo 'Helma', ale neznám naši kanonickou kategorii. Jsou to lyžařské nebo cyklo?"* (Jedno kliknutí opraví 25 řádků).
3. **Exceptions:** Izolované ruční dořešení pro ty nejvíc rozbité sirotky (Undo log musí být dostupný pro pocit kontroly).

## 5. Provider Memory (Od prvního dne)
Nejsme hloupý jednorázový mapping.
- V MVP sbíráme lokální (na úroveň providera izolovanou) paměť.
- Pokud při Resolution uživatel označí "FS" jako "Set Ferrata Basic", uloží se to do `provider_knowledge_base`. Při druhém importu po půl roce se toto pravidlo autmaticky aplikuje. 
- *Varování:* Zatím nepředáváme tuto paměť plošně do Global Knowledge Base (zamezení křížové kontaminace nesmysly).

## 6. Datový Model (Draft Mezivrstva & Variants-Lite)
Špinavá data nepustíme rovnou do tabulky `products`.
- **Import Jobs:** `import_job` (správa uploadu)
- **Import Rows:** `import_row` (Jeden řádek z CSV se statusem `ready` / `review` / `skipped`).
- **Variants Lite:** Připravujeme strukturu tak, aby se řádky lišící se jen slovem "M / L / XL" zařadily pod jeden logický Header Model, ale nestavíme teď robustní PIM ERP. Jde nám pouze o sjednocení záznamů.

## 7. Anti-Goals (Zákaz vývoje pro MVP)
Tohle pro V0.2 striktně pálit nesmíme:
- Žádný generický OCR input z fotek nebo PDF ceníků.
- Nezakládat individuální Assets (jeden pár lyží = jeden řádek s QR). MVP řeší pouze Quantity (mám 5x lyží).
- Nestavět Global Knowledge Base autopilota napříč všemi půjčovnami (Riziko špatného průměrování slangu).
- Free-text kategorie jako finální stav.
