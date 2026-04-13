---
verze: 1.0
datum: 2026-04-13
autor: Antigravity + Martin
změna: Vytvořeno po strategické diskuzi — přechod z pure SaaS na provider-first marketplace model
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

Samotný software se stává levnější a snáze napodobitelný. Trvalejší výhoda vzniká tam, kde se propojí:
- každodenní provoz půjčovny,
- distribuce poptávky,
- důvěra mezi půjčovnou a platformou,
- a síťový efekt mezi nabídkou a zákazníky.

Proto Kitloop nestavíme jako generický rezervační SaaS.
Stavíme ho jako infrastrukturu, která nejdřív řeší realitu půjčovny a teprve potom otevírá distribuční a marketplace vrstvy.

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

Referenční typ produktů: jasné, rychlé, srozumitelné, bez dark patterns.

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

### M0 — Low-barrier adoption
Primární cíl v rané fázi je co nejnižší bariéra vstupu. Pricing model musí podporovat adopci supply, ne ji brzdit.

Možné formy: free tier, pilot zdarma, výrazně zvýhodněný vstup, nebo software zdarma výměnou za účast v síti. Tohle není navždy zamčené pravidlo. Je to growth mechanismus.

### M1 — Standalone SaaS
Půjčovny, které nechtějí distribuční vrstvu nebo marketplace účast, mohou používat Kitloop jako samostatný software.

### M2 — White-label / intake fees
Hodnota z online intake vrstvy: lepší konverze, méně ručního chaosu, rychlejší zpracování poptávek.

### M3 — Distribution monetization
Jakmile Kitloop generuje měřitelnou inkrementální poptávku: paid visibility, verified status, partner placements, B2B reklamní vrstva. Vždy transparentně a bez poškození relevance.

### M4 — Marketplace monetization
Provize pouze tam, kde Kitloop přivedl transakci marketplace kanálem. Ne z organického byznysu půjčovny.

### M5 — Data-driven optionality
Síť může časem odhalit neobslouženou poptávku, pricing patterns a supply gaps. To otevírá budoucí strategické opce (včetně vlastních provozoven — Kitloop Guaranteed), ale není to současná roadmapa.

---

## 9) Roadmap framing

### F0–F4: Ops adoption
První cíl není „spustit marketplace". První cíl je: dostat půjčovny z Excelu do systému, zrychlit pult, snížit chyby, projít piloty, stabilizovat daily usage.

### F5–F6: Controlled online intake
Teprve po stabilním ops jádru přidáváme white-label request flow a případně hybridní potvrzení tam, kde to dává smysl.

### F7: Discovery
Directory spouštíme až ve chvíli, kdy existují kvalitní profily, supply je dostatečně reprezentativní a atribuce je důvěryhodná.

### F8: Marketplace
Marketplace booking přichází až po dosažení hustoty supply a po zvládnutí provozní i reputační stránky.

---

## 10) Co nestavíme teď

- marketplace jako default,
- instant booking jako základní model,
- komplexní pricing engine,
- hodinové sloty a opening hours engine,
- widget do cizího webu jako hlavní směr,
- full dashboard builder,
- customer-configurable bundly,
- hardware-heavy řešení typu IoT lockers.

**Důvod:** nezrychlují adopci jádra nebo předbíhají vrstvu, která ještě nemá oporu v reálném používání.

---

## 11) Decision checklist

Před každou větší prioritou musí platit aspoň jedno z toho:
- zrychlí to issue/return nebo rezervační workflow,
- sníží to chybovost nebo škody,
- zjednoduší to onboarding z Excelu,
- zvýší to důvěru půjčovny v Kitloop,
- vytvoří to základ pro white-label intake,
- nebo to prokazatelně zvyšuje distribuční hodnotu bez poškození provider trust.

Pokud neplatí ani jedno, není to priorita.

---

## 12) Hlavní rizika

**Riziko 1 — „Jen lepší Excel"**
Mitigace: ops jádro musí rychle přejít do white-label intake vrstvy, aby vznikl jasný růstový příběh.

**Riziko 2 — Příliš brzký marketplace push**
Mitigace: držet opt-in distribuci, white-label mezivrstvu a supply-first pořadí.

**Riziko 3 — Reputační nedůvěra půjčoven**
Mitigace: jasná pravidla atribuce, žádná konkurence na white-label portálu, monetizace jen z inkrementální hodnoty.

**Riziko 4 — Over-engineering uvnitř ops vrstvy**
Mitigace: staff flow musí zůstat rychlý, scan-first a provozně jednoduchý.

---

## 13) Jednovětá definice Kitloopu

Kitloop je provider-first operating system pro půjčovny outdoorového vybavení, který z provozního jádra postupně vrství white-label intake, discovery a opt-in marketplace.
