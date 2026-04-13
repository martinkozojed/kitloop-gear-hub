---
verze: 1.1
datum: 2026-04-13
autor: Antigravity + Martin
změna: Doplněna strategická argumentace (commoditizace SaaS), GTM sekce, konkrétní M0 model a Q2/Q3 milestones
nadřazený dokument: —
---

# Kitloop — Strategy SSOT v1.1

## 0) Účel dokumentu

Tento dokument je strategický SSOT pro směr Kitloopu. Určuje:
- co je Kitloop dlouhodobě,
- v jakém pořadí vrstvíme produkt,
- jaké principy jsou neměnné,
- co je teď priorita a co ještě ne.

Tento dokument nenahrazuje provozní SSOT, release gates ani pilotní checklisty. Ty zůstávají platné, dokud nejsou vědomě změněné přes SCOPE CHANGE.

---

## 1) North Star

Kitloop je provider-first operating system pro půjčovny outdoorového vybavení, který se postupně mění v distribuční síť a opt-in marketplace.

Dlouhodobá hodnota Kitloopu nevzniká jen ze softwaru, ale z kombinace:
- provozních workflow,
- supply na straně půjčoven,
- distribučních kanálů,
- zákaznické poptávky,
- a dat o chování trhu.

Software není cíl sám o sobě. Je vstupní brána do sítě.

---

## 2) Strategická teze

V roce 2026 stojí postavení rezervačního systému týdny místo let. AI agenti dokáží vygenerovat funkční CRUD aplikaci za hodiny. Software sám o sobě přestává být vzácný — kdokoliv může mít vlastní systém za zanedbatelnou cenu. Kdokoliv staví jen "software pro půjčovny", staví komoditu.

Trvalejší výhoda vzniká tam, kde se propojí:
- každodenní provoz půjčovny,
- distribuce poptávky,
- důvěra mezi půjčovnou a platformou,
- a síťový efekt mezi nabídkou a zákazníky.

Airbnb nemá hodnotu protože má hezký web. Má hodnotu protože na jednom místě agreguje miliony nabídek a data o chování zákazníků. To se nedá zreplikovat přes noc — síť roste jen s lidmi.

Proto Kitloop nestavíme jako generický rezervační SaaS.
Stavíme ho jako infrastrukturu, která nejdřív řeší realitu půjčovny a teprve potom otevírá distribuční a marketplace vrstvy. Přidaná hodnota není software. Je to komunita půjčoven, zákazníci kteří se vracejí, a data která z toho vznikají.

---

## 3) Proč toto pořadí

Bez silného ops jádra nevznikne důvěra půjčoven.
Bez důvěry půjčoven nevznikne supply.
Bez supply nevznikne marketplace.

Pořadí je tedy závazné:

1. **Ops OS** — Inventář → interní rezervace → výdej/vratka → přehled → print/export
2. **Intake** — White-label request flow na straně půjčovny
3. **Distribution** — Directory / discovery layer
4. **Marketplace** — Opt-in booking a checkout napříč půjčovnami

Tohle pořadí není kosmetické. Je to ochrana proti tomu, aby Kitloop vypadal hezky navenek, ale nefungoval v reálném provozu.

---

## 4) Co je Kitloop dnes

Kitloop je dnes primárně operating system pro půjčovny.

Jádro hodnoty pro první adopci:
- rychlejší obsluha u pultu,
- méně chyb v dostupnosti a výdeji,
- lepší dohledatelnost,
- jednodušší přechod z Excelu, papíru a telefonu,
- datový základ pro další vrstvy.

Marketplace dnes není hlavní produkt.
Marketplace je budoucí vrstva, která musí vyrůst z reálného používání.

---

## 5) Produktová filozofie: Respekt

Kitloop nevydělává tím, že uživatele mate, zdržuje nebo tlačí do zbytečných voleb.
Vydělává tím, že šetří čas:
- půjčovně čas na správu a provoz,
- zákazníkovi čas na nalezení vhodné nabídky.

**Pravidla:**
- checkout má být co nejkratší,
- odmítnutí doplňkové nabídky musí být stejně snadné jako přijetí,
- placené zvýhodnění musí být transparentně označené,
- každá funkce musí odpovědět na otázku: vrací to půjčovně čas, peníze nebo důvěru?

**Referenční bod:** Ne Ryanair. Ne Booking v nejhorším vydání. Spíš jako Basecamp nebo Stripe — produkty, které jsou jasné, rychlé a respektují inteligenci uživatele. Platíš za hodnotu, ne za to, že nevíš jak odejít.

---

## 6) Non-negotiables

Tyto principy se nemění bez explicitního SCOPE CHANGE:

- **Ops-first.** Neurychlujeme marketplace na úkor provozního jádra.
- **Provider-first.** Vztah se zákazníkem primárně vlastní půjčovna.
- **White-label bez konkurence.** White-label portál půjčovny nikdy neukazuje konkurenci.
- **Distribution je opt-in.** Marketplace není default ani vynucený model.
- **Scan-first ve špičce.** Kitloop musí být u pultu rychlejší než papír.
- **Sety pro rychlost, komponenty pro pravdu.**
- **Progressive onboarding.** Systém musí fungovat i s minimem dat.
- **Auditovatelnost.** Výdej, vratka, override a změny stavů musí být dohledatelné.
- **Žádný scope creep bez trade-offu.** Každá nová věc musí být přiřazená k fázi a metrice.

---

## 7) Produktové vrstvy

### Vrstva A — Ops OS
Základ produktu pro půjčovnu: inventář, interní rezervace, výdej a vratka, stav vybavení, denní přehled, exporty a print.

**Cíl:** udělat z Kitloopu systém, který je použitelnější než Excel a bezpečnější než improvizace.

### Vrstva B — White-label intake
Online poptávka na straně půjčovny: request link, hosted booking portal, schválení / zamítnutí, vznik interní rezervace.

**Cíl:** přidat zákaznický vstup bez rozbití dostupnosti a bez reputačního rizika.

### Vrstva C — Directory
Veřejná discovery vrstva: profily půjčoven, lokace, aktivity, transparentní atribuce poptávky.

**Cíl:** začít budovat distribuční hodnotu bez toho, aby se Kitloop choval jako konkurent půjčoven.

### Vrstva D — Marketplace
Opt-in booking napříč půjčovnami: unifikovaný booking, checkout, ranking, atribuce, transakční logika.

**Cíl:** vytvořit síťový efekt a marketplace economics až ve chvíli, kdy na to existuje supply i důvěra.

---

## 8) Monetizační architektura

### M0 — Free SaaS za marketplace listing
SaaS software pro správu půjčovny je zdarma pro každého, kdo se zalistuje na marketplace. "Zdarma dostaneš nejlepší software na trhu. Jedinou cenou je, že tvůj katalog bude viditelný na naší mapě."

Každá půjčovna = nový obsah a nabídka pro marketplace. Lock-in: historická data, zákazníci, statistiky — odejít = ztratit vše. Nízká bariéra vstupu = rychlejší growth. Jeden rozhovor, dva výsledky.

### M1 — Standalone SaaS
Půjčovny, které nechtějí být na marketplace (privátní firemní půjčovny, organizace), platí měsíční předplatné. Jasná volba: buď nám dej zákazníky, nebo peníze.

### M2 — White-label / intake fees
Hodnota z online intake vrstvy: lepší konverze, méně ručního chaosu, rychlejší zpracování poptávek.

### M3 — Distribution monetization

Jakmile Kitloop generuje měřitelnou inkrementální poptávku: paid positioning (transparentně označené), verified badge, partner placements, B2B reklamní vrstva (výrobci jako Petzl, Mammut platí za přístup k intent datům). Vždy transparentně a bez poškození relevance.

### M4 — Marketplace monetization

Provize pouze tam, kde Kitloop přivedl transakci marketplace kanálem. Ne z organického byznysu půjčovny.

Transakční služby: dynamické ceny (algoritmus navrhuje optimální cenu dle počasí, svátků, vytíženosti — Kitloop bere cut z navýšení) a pojištění při checkoutu (one-click pojistka, affiliate cut od pojišťovny). Tyto funkce patří do marketplace kontextu, ne do SaaS — v marketplace mají jinou psychologii vnímané hodnoty.

### M5 — Data-driven optionality → Kitloop Guaranteed
Síť může časem odhalit neobslouženou poptávku, pricing patterns a supply gaps. Data z marketplace řeknou, kde je poptávka bez nabídky. Tuto informaci nelze získat jinak než provozováním sítě.

Vlastní pobočky v těchto lokalitách budou mít výhodu dokonalé informace o trhu a plný margin bez dělení. Garantovaná kvalita, standardizovaná služba. Začínáme jako platforma, ale data nás přirozeně povedou k vlastnímu provozu tam, kde to dává největší ekonomický smysl.

---

## 9) Go-to-Market: Prvních 10 půjčoven

Bez nabídky není marketplace. Prvních 10 musí přijít před spuštěním veřejného marketplace.

- **Ruční akvizice** — osobní kontakt s půjčovnami ve 2–3 lokalitách (Pec, Špindl, Beskydy).
- **Nabídka:** "Váš software zdarma navždy, výměnou za listing na naší mapě."
- **White-glove onboarding** — pomoc s přenosem dat z Excelu.
- Získat první recenze a fotky → obsah pro marketplace.

---

## 10) Roadmap framing

### F0–F4: Ops adoption

První cíl není „spustit marketplace". První cíl je: dostat půjčovny z Excelu do systému, zrychlit pult, snížit chyby, projít piloty, stabilizovat daily usage.

### F5–F6: Controlled online intake

Teprve po stabilním ops jádru přidáváme white-label request flow a případně hybridní potvrzení tam, kde to dává smysl.

### F7: Discovery

Directory spouštíme až ve chvíli, kdy existují kvalitní profily, supply je dostatečně reprezentativní a atribuce je důvěryhodná.

### F8: Marketplace

Marketplace booking přichází až po dosažení hustoty supply a po zvládnutí provozní i reputační stránky.

### Konkrétní milestones

- **Q2 2026 (teď):** Geolokace půjčoven (GPS + mapa), veřejný profil půjčovny (bez přihlášení), globální vyhledávač dostupnosti (datum + lokalita).
- **Q3 2026:** Zákaznický checkout (rezervace bez vytvoření účtu), platební brána (Stripe), emailová potvrzení a reminders.
- **Postupně:** Dynamické ceny (weather API + algoritmus), pojištění při checkoutu, paid positioning v marketplace.

---

## 11) Co nestavíme teď

- marketplace jako default,
- instant booking jako základní model,
- komplexní pricing engine,
- hodinové sloty a opening hours engine,
- widget do cizího webu jako hlavní směr,
- full dashboard builder,
- customer-configurable bundly,
- hardware-heavy řešení typu IoT lockers (hardware = kapitál, komplexita),
- supply chain integrace s výrobci (potřebujeme nejdřív data o objemu),
- vlastní pojišťovna (regulace, licence).

**Důvod:** nezrychlují adopci jádra nebo předbíhají vrstvu, která ještě nemá oporu v reálném používání.

---

## 12) Decision checklist

Před každou větší prioritou musí platit aspoň jedno z toho:
- zrychlí to issue/return nebo rezervační workflow,
- sníží to chybovost nebo škody,
- zjednoduší to onboarding z Excelu,
- zvýší to důvěru půjčovny v Kitloop,
- vytvoří to základ pro white-label intake,
- nebo to prokazatelně zvyšuje distribuční hodnotu bez poškození provider trust.

Pokud neplatí ani jedno, není to priorita.

---

## 13) Hlavní rizika

**Riziko 1 — „Jen lepší Excel"**
Mitigace: ops jádro musí rychle přejít do white-label intake vrstvy, aby vznikl jasný růstový příběh.

**Riziko 2 — Příliš brzký marketplace push**
Mitigace: držet opt-in distribuci, white-label mezivrstvu a supply-first pořadí.

**Riziko 3 — Reputační nedůvěra půjčoven**
Mitigace: jasná pravidla atribuce, žádná konkurence na white-label portálu, monetizace jen z inkrementální hodnoty.

**Riziko 4 — Over-engineering uvnitř ops vrstvy**
Mitigace: staff flow musí zůstat rychlý, scan-first a provozně jednoduchý.

---

## 14) Jednovětá definice Kitloopu

Kitloop je provider-first operating system pro půjčovny outdoorového vybavení, který z provozního jádra postupně vrství white-label intake, discovery a opt-in marketplace.
