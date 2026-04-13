---
verze: 2.1
datum: 2026-04-13
autor: Antigravity + Martin
změna: Brand manual v2.0 + Addendum v2.1 (token systém, dark mode, ikonografie, logo, responsive)
nadřazený dokument: strategy/ssot_v1.1.md
---

# Kitloop — Brand Manual v2.1

**Poznámka:** Tento dokument pokrývá principy a systém. Konkrétní implementační kroky jsou v samostatném Implementation Backlog dokumentu.

---

## 0) Účel

Brand manuál definuje vizuální charakter Kitloopu. Je stabilní — nemění se s každým sprintem. Implementační detaily (co změnit v jakém souboru) patří do živého backlogu, ne sem.

---

## 1) Brand charakter

### Jednovětá definice

**Přesný terén.** Krásný protože funguje, ne protože je dekorativní.

### Tři pilíře

**Přesný** — rychlý, dohledatelný, jasný. Žádné dark patterns. Reference: Stripe, Linear.

**Terénní** — navržený pro reálný provoz u pultu i v horách. Outdoor komunita — přímá, praktická, ne korporátní.

**Přívětivý** — systém který nevyžaduje manuál. Onboarding z Excelu je jednoduchý. Žádný interface neodradí.

### Čím Kitloop není

Ne fashion-forward (Arc'teryx marketing), ne enterprise SaaS (Salesforce), ne Booking.com v nejhorším vydání. Spíš jako kvalitní outdoorový nástroj — Petzl čelovka, Black Diamond karabina. Funkce jako forma.

### Test pro každé rozhodnutí

> "Vypadá to jako přesný outdoorový nástroj, nebo jako každý druhý SaaS web?"

---

## 2) Primární kontext: Dashboard

Kitloop je dnes ops-first produkt. Dashboard má prioritu ve všech designových rozhodnutích. Marketplace vrstva přijde, ale až po stabilním ops jádru.

**Dashboard kontext:**
- personál u pultu, 8+ hodin denně
- scan-first, rychlost je safety net
- čitelnost a kontrast před estetikou
- každý pixel musí sloužit výdeji nebo vrátce

**Marketplace kontext** (budoucí vrstva — vzniká až z reálného používání):
- zákazník na mobilu, plánuje výlet
- discovery-first, prostorné, vizuální

---

## 3) Barvy

### Filozofie

Brand teal je barva akcí. Neutrály jsou teal-saturované — každý šedý tón má 3–5 % tealu. Výsledek: sublimální soudržnost bez explicitní snahy.

### Primární paleta

```
--brand-50:  #E0F2F1   tinted backgrounds, selected rows
--brand-100: #B2DFDB   light badges, focus rings
--brand-200: #80CBC4   disabled states
--brand-300: #4DB6AC   ikony, dekorativní prvky
--brand-400: #26A69A   hover na primary button
--brand-500: #009688   PRIMÁRNÍ akční barva
--brand-600: #00897B   text linky, active nav
--brand-700: #00796B   active/pressed stavy
--brand-800: #00695C   high contrast text
--brand-900: #004D40   velmi tmavý kontext
```

**Přístupnost:** `#009688` má kontrast 4.6:1 na bílé — splňuje WCAG AA pro UI komponenty a velký text. Pro malý text v odkazech preferovat `#00897B` (5.3:1).

### Neutrály (teal-saturated)

Místo flat gray `hsl(0, 0%, X%)` vždy `hsl(174, 3–5%, X%)`. Nikdy pure gray.

```
--neutral-0:   hsl(174, 5%, 99%)   page background
--neutral-50:  hsl(174, 5%, 97%)   subtle surface
--neutral-100: hsl(174, 5%, 94%)   muted background
--neutral-200: hsl(174, 4%, 88%)   borders
--neutral-400: hsl(174, 3%, 62%)   placeholder text
--neutral-500: hsl(174, 3%, 46%)   secondary text
--neutral-700: hsl(174, 5%, 28%)   body text
--neutral-900: hsl(174, 8%, 11%)   headings
```

### Sémantické barvy

```
--status-success: #10B981   dostupné, potvrzeno
--status-warning: #F59E0B   čeká, expiruje
--status-danger:  #EF4444   po splatnosti, chyba
--status-info:    #3B82F6   informační
```

Pozadí: `/10` opacity tint. Border: `/20` opacity.

### Marketplace accent

```
--accent-coral: #FF7F50
```

**Výhradně marketplace kontext — nikdy v dashboardu.**

Kontrast `#FF7F50` na bílé je 2.2:1 — nesplňuje WCAG AA pro text. Coral je bezpečný pouze jako dekorativní prvek, ikona, nebo velké tlačítko s **tmavým textem uvnitř**. Nikdy pro textový odkaz, malý badge nebo label na světlém pozadí.

---

## 4) Typografie

### Rozhodnutí: Manrope + Inter

**Manrope** — display a headings. Geometrický, přívětivý, s vlastním charakterem. Používá ho AllTrails. Nahrazuje Poppins.

**Inter** — body a data. Prověřený workhorse pro data-dense interfaces, tabular numbers.

```css
--font-display: 'Manrope', system-ui, sans-serif;
--font-body:    'Inter', system-ui, sans-serif;
```

### Škála a hierarchie

| Úroveň | Font | Velikost | Váha | Tracking |
|--------|------|----------|------|----------|
| display | Manrope | 36–48px | 800 | -0.03em |
| heading-lg | Manrope | 24–30px | 700 | -0.02em |
| heading-md | Manrope | 18–20px | 600 | -0.01em |
| body | Inter | 14–16px | 400 | 0 |
| label | Inter | 12px | 500 | +0.03em |
| caption | Inter | 11px | 500 | +0.06em uppercase |

### Pravidla

- Tabulární čísla pro KPI a data: `font-feature-settings: "tnum" 1`
- Nadpisy nad 24px: vždy záporný tracking
- Captions a labels: vždy uppercase + pozitivní tracking
- Body text: max šířka 65–75 znaků (`max-w-prose`)
- Minimum font-weight pro headings: 600

---

## 5) Surface systém

### Dashboard: Solid-first

V ops dashboardu platí **solid surfaces jako výchozí**. `backdrop-filter: blur` je výkonnostně náročný a na levných zařízeních (tablety na pultu) způsobuje lag. Glass efekty v dashboardu pouze tam, kde vizuálně překrývají obsah — sticky headers, floating panels.

```
Page:   neutral-0   hsl(174, 5%, 99%)
Cards:  white + border neutral-200
Muted:  neutral-50  hsl(174, 5%, 97%)
```

**Glass výjimky v dashboardu:** dialogy, dropdown menu, command palette — zde glass dává smysl protože překrývají obsah.

### Glass systém (overlaye a marketplace)

**Glass Standard** — pro overlaye v dashboardu, karty na marketplace:

```css
background: rgba(255,255,255,0.78);
backdrop-filter: blur(20px) saturate(180%);
border: 1px solid rgba(255,255,255,0.30);
border-radius: 20px;
```

**Glass Elevated** — dropdown, modaly, command palette (referenční implementace = stávající dropdown):

```css
background: rgba(255,255,255,0.85);
backdrop-filter: blur(40px) saturate(200%);
border: 1px solid rgba(255,255,255,0.45);
border-radius: 24px;
```

**Glass Tinted** — pouze marketplace, hero sekce přes fotografii:

```css
background: rgba(0,150,136,0.08);
backdrop-filter: blur(24px);
border: 1px solid rgba(0,150,136,0.15);
```

**Pravidlo:** Nikdy nestackovat více než 2 glass vrstvy. Fallback pro starší prohlížeče:

```css
@supports not (backdrop-filter: blur(1px)) {
  background: rgba(255,255,255,0.95);
}
```

---

## 6) Spacing a radius

### Spacing

Základní jednotka 8px. Vše je násobek.

```
4px   tight — výjimky
8px   base — icon padding, badge spacing
16px  default — button padding, form gap
24px  minimum padding karty
32px  section gap uvnitř komponenty
48px  section spacing desktop
96px  hero/landing spacing
```

Pravidlo: výchozí whitespace je vždy více než první instinkt.

### Radius

```
6px    inputs
10px   buttons
16px   standardní karty
20px   dialogy, marketplace karty
24px   elevated overlaye
9999px status badges, pills, FAB
```

**Pozor na siblings:** Input (6px) a button (10px) vedle sebe vypadají jako designová nedotaženost, ne záměr. Pro search field + button vedle sebe sjednotit radius na 8px. Asymetrie funguje pouze u zanořených elementů, ne u prvků na stejné úrovni.

### Shadow systém

```
shadow-sm:    0 2px 6px rgba(0,0,0,0.06)
shadow-md:    0 4px 12px rgba(0,0,0,0.08)
shadow-lg:    0 8px 24px rgba(0,0,0,0.10)
shadow-xl:    0 16px 48px rgba(0,0,0,0.12)
shadow-brand: 0 4px 14px rgba(0,150,136,0.35)   primary button
```

---

## 7) Komponenty — principy

### Buttony

Primary button = solid brand-500, nikdy slate-900.

```
výchozí: bg brand-500, color white, shadow-brand
hover:   bg brand-400, shadow větší, translateY(-1px)
active:  bg brand-700, scale(0.97)
```

Hover musí měnit alespoň dvě věci — color change + shadow nebo transform. Samotná opacity change nestačí.

Secondary, ghost a destructive sledují stejnou logiku — jasná vizuální diferenciace, ne jen barevný rozdíl.

### Inputs

Výchozí radius: 6px (odlišuje od buttonů). Focus ring: brand-500 + offset.

Placeholder musí být vizuálně výrazně světlejší než zadaný text.

### Status badges

StatusBadge (rounded-full, uppercase, tracking) je nejlépe navržená komponenta v systému — zachovat a rozšířit, ne míchat s plain Badge.

---

## 8) Kritické stavy

Toto je pro dashboard stejně důležité jako "hezké" stavy. Zde se buduje nebo ztrácí důvěra v produkt.

### Error

Jasná červená, vždy s popisem příčiny — ne jen "Chyba." Nikdy prázdná stránka.

```css
border: 1.5px solid var(--status-danger);
background: rgba(239,68,68,0.05);
```

Doplnit: co se stalo + co udělat dál.

### Overdue / Conflict

Amber nebo červená podle závažnosti. Timestamp kdy vypršelo. V agendě vždy první — urgency indikace musí být čitelná na první pohled bez hover.

### Offline / Sync problém

Persistentní banner nahoře — ne toast který zmizí. Uživatel u pultu nesmí přijít o data aniž by věděl proč.

### Loading

Skeleton loader (ne spinner) pro content-heavy oblasti — tabulky, KPI karty. Spinner pouze pro akce (button submit, scan confirm).

### Empty state

Nikdy jen prázdný prostor. Vždy: co je prázdné + proč + co udělat. Primární akce v empty state = brand-500 button.

```
Nemáte žádné rezervace na dnes.
[Přidat rezervaci]
```

### Disabled

Vizuálně odlišný, ale ne záhadný. Pokud je element disabled, tooltip nebo inline text vysvětlí proč. Opacity 40–50 %, nikdy méně.

---

## 9) Motion

### Filozofie

Motion komunikuje stav, ne dekoruje. Každá animace odpovídá na otázku: "Co se právě stalo?"

### Duration

```
80ms    hover state — musí být okamžitý
150ms   button press, toggle
250ms   panel, accordion, tab
350ms   modal entry
500ms   SVG draw, sparkline entry
```

### Easing

```
ease-out:    cubic-bezier(0.0, 0, 0.2, 1)     element přijíždí
ease-in:     cubic-bezier(0.4, 0, 1, 1)       element odchází
ease-spring: cubic-bezier(0.16, 1, 0.3, 1)   živý pocit
```

### Signature moment: Scan-Confirm

Nejčastější interakce v dashboardu. Zde je brand charakter nejviditelnější.

```
T+0ms:   scan — input flash teal, fade (400ms)
T+50ms:  SVG checkmark draw (350ms, ease-out)
T+50ms:  item karta slide-in (200ms, ease-spring)
T+100ms: row flash brand-50 → transparent (500ms)
```

Error: 3-beat horizontal shake + červená + popis příčiny.

### Staggered entry

Pro listy a karty: 40ms delay mezi položkami, max 200ms celkem.

### Přístupnost

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 10) Dashboard vs. Marketplace

Stejná DNA, různá exprese.

### Dashboard — Precision Mode

- Solid surfaces jako výchozí
- Inter dominuje, Manrope jen na page titles
- Teal primary, žádný coral
- Medium-high hustota
- Motion rychlá, funkcionální
- Žádná fotografie
- Reference: Linear — dim the chrome, spotlight the work

### Marketplace — Discovery Mode (budoucí vrstva)

- Glass surfaces přes fotografii
- Manrope dominuje
- Teal + coral accent
- Nízká hustota, prostorné
- Dokumentární outdoor fotografie
- Reference: Banff & Lake Louise — teal z krajiny, activity-first

---

## 11) Fotografie

### Dashboard

Žádná. Ikony jsou dostatečné.

### Marketplace

- Reálné vybavení v reálném terénu
- Lidé v akci, reální zákazníci
- Konkrétní lokace — poznat kde je
- NE stock fotografie s generickými modely
- NE přefiltrované HDR nebo přesaturované tóny
- NE teplé oranžové/červené tóny — teal sedí na chladnějších fotografiích

---

## 12) Dos & Don'ts

### Dělej

- Teal jako barva každé akce
- Manrope pro všechny headings
- Shadow-brand na primary button
- StatusBadge (ne plain Badge) pro statusy
- Tabular numbers pro data v dashboardu
- Uppercase + pozitivní tracking pro section labels
- Popis příčiny u každého error stavu
- Skeleton loader pro content areas
- `prefers-reduced-motion` vždy

### Nedělej

- `bg-slate-900` jako primary button
- Hardcoded `green-600`, `emerald-600` mimo tokeny
- Flat gray bez teal saturace
- Stock fotografie s generickými modely
- Opacity change jako jediný hover efekt
- Coral pro text nebo malý badge na světlém pozadí
- Glass v hlavním obsahu dashboardu
- Input (6px) a button (10px) vedle sebe bez úpravy radius
- Více než 2 nested glass vrstvy
- Empty state bez vysvětlení a akce
- Disabled element bez vysvětlení proč

---

## 13) Jednovětý brand charakter

> Kitloop vypadá jako přesný outdoorový nástroj — krásný protože funguje, ne protože je dekorativní.

---

# Addendum — Token systém, Dark mode, Ikonografie, Logo, Responsive

---

## A) Token systém — CSS custom properties

### Schéma pojmenování

```
--[kategorie]-[skupina]-[hodnota]
```

### Barvy

```css
/* Brand */
--color-brand-50:  #E0F2F1
--color-brand-100: #B2DFDB
--color-brand-200: #80CBC4
--color-brand-300: #4DB6AC
--color-brand-400: #26A69A
--color-brand-500: #009688
--color-brand-600: #00897B
--color-brand-700: #00796B
--color-brand-800: #00695C
--color-brand-900: #004D40

/* Neutrály */
--color-neutral-0:   hsl(174, 5%, 99%)
--color-neutral-50:  hsl(174, 5%, 97%)
--color-neutral-100: hsl(174, 5%, 94%)
--color-neutral-200: hsl(174, 4%, 88%)
--color-neutral-300: hsl(174, 4%, 78%)
--color-neutral-400: hsl(174, 3%, 62%)
--color-neutral-500: hsl(174, 3%, 46%)
--color-neutral-700: hsl(174, 5%, 28%)
--color-neutral-900: hsl(174, 8%, 11%)

/* Status */
--color-status-success: #10B981
--color-status-warning: #F59E0B
--color-status-danger:  #EF4444
--color-status-info:    #3B82F6

/* Status tints */
--color-status-success-tint: rgba(16, 185, 129, 0.10)
--color-status-warning-tint: rgba(245, 158, 11, 0.10)
--color-status-danger-tint:  rgba(239, 68, 68, 0.10)
--color-status-info-tint:    rgba(59, 130, 246, 0.10)

/* Accent (marketplace only) */
--color-accent-coral: #FF7F50
```

### Typografie

```css
--font-display: 'Manrope', system-ui, sans-serif;
--font-body:    'Inter', system-ui, sans-serif;
--font-mono:    'SF Mono', 'Fira Code', monospace;
```

### Spacing

```css
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
--space-24: 96px
```

### Radius

```css
--radius-sm:   6px
--radius-md:   10px
--radius-lg:   16px
--radius-xl:   20px
--radius-2xl:  24px
--radius-full: 9999px
```

### Shadow

```css
--shadow-sm:    0 2px 6px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
--shadow-md:    0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
--shadow-lg:    0 8px 24px rgba(0,0,0,0.10), 0 3px 8px rgba(0,0,0,0.04);
--shadow-xl:    0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06);
--shadow-brand: 0 4px 14px rgba(0, 150, 136, 0.35);
```

### Motion

```css
--duration-instant: 80ms
--duration-fast:    150ms
--duration-normal:  250ms
--duration-slow:    350ms
--duration-draw:    500ms

--ease-out:    cubic-bezier(0.0, 0, 0.2, 1)
--ease-in:     cubic-bezier(0.4, 0, 1, 1)
--ease-spring: cubic-bezier(0.16, 1, 0.3, 1)
```

### Sémantické aliasy

Komponenty používají sémantické aliasy, ne přímé hodnoty.

```css
/* Akce */
--color-action-primary:       var(--color-brand-500)
--color-action-primary-hover: var(--color-brand-400)
--color-action-primary-press: var(--color-brand-700)

/* Text */
--color-text-primary:   var(--color-neutral-900)
--color-text-secondary: var(--color-neutral-500)
--color-text-muted:     var(--color-neutral-400)
--color-text-inverse:   white
--color-text-brand:     var(--color-brand-600)

/* Surfaces */
--color-surface-page:   var(--color-neutral-0)
--color-surface-subtle: var(--color-neutral-50)
--color-surface-muted:  var(--color-neutral-100)
--color-surface-card:   white

/* Borders */
--color-border-default: var(--color-neutral-200)
--color-border-strong:  var(--color-neutral-300)
--color-border-brand:   var(--color-brand-500)
```

---

## B) Dark mode

Dark mode je relevantní pro dashboard — večerní provoz půjčovny, horské chatky, tmavé sklady. Není to estetická volba, je to provozní požadavek.

### Jak se teal chová na tmavém pozadí

Na tmavém pozadí se posuneme o dva stupně výše v paletě. `--color-brand-500` na tmavém pozadí má dostatečný kontrast, ale pro primární tlačítko je bezpečnější `--color-brand-400` (#26A69A). Teal obecně v dark mode funguje dobře protože je dostatečně sytý.

### Tmavé neutrály

Hue zůstává stejný (174), jen lightness se otočí.

```css
@media (prefers-color-scheme: dark) {
  --color-neutral-0:   hsl(174, 8%, 10%)
  --color-neutral-50:  hsl(174, 7%, 13%)
  --color-neutral-100: hsl(174, 6%, 17%)
  --color-neutral-200: hsl(174, 5%, 22%)
  --color-neutral-300: hsl(174, 4%, 30%)
  --color-neutral-400: hsl(174, 3%, 48%)
  --color-neutral-500: hsl(174, 3%, 62%)
  --color-neutral-700: hsl(174, 4%, 80%)
  --color-neutral-900: hsl(174, 5%, 96%)

  --color-action-primary:       var(--color-brand-400)
  --color-action-primary-hover: var(--color-brand-300)
  --color-action-primary-press: var(--color-brand-600)

  --color-text-brand: var(--color-brand-300)
}
```

### Shadows v dark mode

```css
@media (prefers-color-scheme: dark) {
  --shadow-sm:    0 0 0 1px var(--color-neutral-200);
  --shadow-md:    0 0 0 1px var(--color-neutral-200), 0 4px 12px rgba(0,0,0,0.3);
  --shadow-lg:    0 0 0 1px var(--color-neutral-200), 0 8px 24px rgba(0,0,0,0.4);
  --shadow-brand: 0 4px 20px rgba(0, 150, 136, 0.25);
}
```

### Glass v dark mode

```css
/* Glass Standard — dark */
background: rgba(20, 35, 33, 0.80);
backdrop-filter: blur(20px) saturate(160%);
border: 1px solid rgba(255, 255, 255, 0.08);

/* Glass Elevated — dark */
background: rgba(25, 42, 40, 0.88);
backdrop-filter: blur(40px) saturate(180%);
border: 1px solid rgba(255, 255, 255, 0.10);
```

### Přepínač

Kitloop respektuje systémové nastavení (`prefers-color-scheme`). Ruční přepínač světlý/tmavý je nice-to-have, ne v1 požadavek.

---

## C) Ikonografie

### Sada: Lucide

Lucide zůstává. Konzistentní, open source, React-friendly. Vlastní sada ikon není priorita.

### Pravidla

**Stroke width: 1.5px** — výchozí. Neměnit bez výjimky.

**Velikosti:**

```
16px   inline v textu, v badges, v table cells
20px   v buttonech, v form labels
24px   standalone — empty state, navigation
32px   velké dekorativní — onboarding, ilustrace stavu
```

**Alignment s typografií:** Ikona v inline kontextu musí být vertikálně centrovaná na cap-height textu, ne na line-height. V praxi: `display: flex; align-items: center; gap: 6px`.

**Barva:** Ikona dědí barvu textu kontextu. Nikdy hardcoded barva. Výjimka: status ikony dostávají příslušný status token.

**Interaktivní ikony:** `transition: color var(--duration-fast) var(--ease-out)`.

### Co Lucide nemá

Custom SVG ve stejném stroke stylu (1.5px, round linecap, round linejoin). Nikdy míchat s jinou ikonovou sadou.

---

## D) Logo

### Aktuální stav

Textový logotyp: **"Kit"** v `--color-brand-600` + **"loop"** v `--color-neutral-900`. Manrope 700. Interim řešení.

### Co chybí

Symbol/mark pro favicon, app ikonu, QR kódy, fyzické materiály. Potřeba před spuštěním marketplace a public directory.

### Směr symbolu

**Koncept: Loop jako cyklus.** Vybavení jde ven, vrátí se, jde znovu. Jednoduchá uzavřená křivka — jeden tah, geometrický, s mírným napětím. Teal fill nebo stroke. Čitelný na 16px i na 512px.

Co symbol nesmí být: outdoor klišé (hora, strom, vlna), příliš komplexní, odvozený od konkrétního vybavení.

### Pravidla pro textový logotyp (interim)

```
Font:       Manrope 700
"Kit":      var(--color-brand-600)   #00897B
"loop":     var(--color-neutral-900)
Mezera:     žádná — "Kitloop" jako jedno slovo
Minimum:    120px šířka pro čitelnost
Na tmavém:  "Kit" var(--color-brand-400), "loop" white
```

---

## E) Responsive

### Breakpoints

```css
--bp-sm:  640px
--bp-md:  768px
--bp-lg:  1024px
--bp-xl:  1280px
--bp-2xl: 1536px
```

Dashboard je primárně desktop/tablet. Marketplace je primárně mobile.

### Spacing scale na mobile

Výchozí pravidlo: **o jeden krok dolů pod 768px, o dva kroky dolů pod 480px**.

```
Desktop → Tablet → Mobile
96px → 64px → 48px
64px → 48px → 32px
48px → 32px → 24px
32px → 24px → 20px
```

Vnitřní padding karet (`p-6`) zůstává.

### Typografická škála na mobile

```
display (48px) → 32px pod 768px → 28px pod 480px
heading-lg (30px) → 24px pod 768px → 20px pod 480px
heading-md (20px) → 18px pod 768px → 16px pod 480px
body, label, caption — nemění se
```

### Dashboard na mobile

Edge case — výjimečně kontrola rezervace. Bottom navigation a FAB jsou mobile-specific. Scan flow musí fungovat jednou rukou — FAB uprostřed dosahu palce, scan input celou šířkou.

### Marketplace na mobile

Mobile-first. Výchozí design je 375px, desktop je rozšíření.

- Touch target minimum 44×44px
- Karty: full-width pod 640px, 2 sloupce nad 640px, 3+ nad 1024px
- Map view: full-screen na mobilu, split-view na desktopu
- Filter panel: bottom sheet na mobilu, sidebar na desktopu

---

*Tento dokument je stabilní základ. Mění se vědomě a jen tehdy, když se mění brand charakter nebo vizuální systém.*
