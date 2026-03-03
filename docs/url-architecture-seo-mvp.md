# URL architektura a SEO – MVP/pilot (kitloop.cz)

**Cíl:** Oddělit indexovatelný marketing web od neindexovatelné aplikace bez zpomalení vývoje. Žádné marketingové modaly v aplikaci.

---

## A) Current state map

| URL | Status | Redirect | Indexability |
|-----|--------|----------|--------------|
| `https://kitloop.cz/` | **200** | Žádný (server vrací `index.html`) | **Indexovatelné** – stejný HTML jako ostatní |
| `https://kitloop.cz/onboarding` | **200** | Žádný | **Indexovatelné** |
| `https://kitloop.cz/login` | **200** | Žádný | **Indexovatelné** |
| `https://kitloop.cz/provider/dashboard` | **200** | Žádný | **Indexovatelné** |
| `https://kitloop.cz/app` | **200** (SPA) | Žádný; v Reactu není route → **NotFound** | **Indexovatelné** (stejný shell) |
| `https://app.kitloop.cz/` | **N/A** (DNS neexistuje / connection failed) | — | — |

**Proč se root „chová jako zavřený“:**  
Na serveru je vždy **200** a stejný `index.html`. „Zavřenost“ je jen **client-side**: React Router má `<Route path="/" element={<Navigate to="/onboarding" replace />} />`, takže v prohlížeči uživatel okamžitě končí na `/onboarding`. Pro crawler je `/` i `/onboarding` stejný HTML (bez meta robots, bez canonical) → **vše se může indexovat**.

**Konfigurace v repu:**

- **Netlify:** `netlify.toml` → `publish = "dist"`, žádné redirecty v toml.  
- **Redirects:** `public/_redirects` obsahuje jen `/* /index.html 200` → SPA fallback pro všechny cesty.  
- **Headers:** `netlify.toml` [[headers]] for `/*` – CSP, Referrer-Policy, X-Frame-Options atd. **Žádný X-Robots-Tag.**  
- **React Router:** Žádný `basename`. Route `/` → `<Navigate to="/onboarding" replace />`. `/app` nemá vlastní route → padá na `*` → `<NotFound />`.  
- **HTML:** `index.html` – jeden title/description pro celou SPA, **žádný `<meta name="robots">`**, žádný canonical.  
- **robots.txt / sitemap.xml:** V repu **nejsou**.

---

## B) Doporučení: varianta a tradeoffy

### Rozdíl: `/app` (subdirectory) vs `app.kitloop.cz` (subdomain)

| Kritérium | **/app (jedna site)** | **app.kitloop.cz (dvě sites)** |
|-----------|------------------------|---------------------------------|
| **SEO / indexace** | Jedna doména; noindex jen pro `/app/*` (header nebo meta). Sitemap/robots jen marketing cesty. Riziko: omylem odkaz na app cestu = může se objevit v GSC. | Čistá hranice: app je jiná doména → GSC může být samostatná property, žádné app URL na kitloop.cz. |
| **Auth / cookies** | Cookie na `kitloop.cz` platí pro celou doménu včetně `/app`. Žádná změna. | Cookie musí být buď na `.kitloop.cz` (sdílené) nebo na `app.kitloop.cz`. Sdílená doména `.kitloop.cz` funguje pro app + marketing; samostatná app site = stejná doména cookie při správném nastavení. |
| **Dev overhead** | Menší: jedna codebase, jeden deploy, pouze routing a headers. | Větší: druhá Netlify site, DNS pro `app.kitloop.cz`, build s `basename="/"` pro app deploy (nebo monorepo split). |

### Doporučení pro MVP/pilot: **VARIANTA B – jedna site, app pod `/app`**

**Důvody:**

1. **Nejmenší změna:** Žádný DNS, žádná druhá Netlify site, žádný split deployů.  
2. **Rychlé ošetření indexace:** `X-Robots-Tag: noindex` pro `/app/*` + robots.txt + sitemap jen marketing = GSC nebude indexovat app URL.  
3. **Auth bez rizika:** Cookie zůstávají na `kitloop.cz`, žádná změna domény.  
4. **Pilot = in-app komunikace:** Důraz je na stabilitu a rychlost; čistota subdomény může přijít po pilotu.

**Co získáme:**

- Root `/` = marketing landing (200, title/description, indexovatelné).  
- Vše pod `/app/*` (včetně přesměrovaného `/onboarding`, `/login`, dashboard) = noindex, neindexovatelné.  
- Jasná sitemap a robots.txt jen pro marketing.  
- Jeden deploy, jeden repozitář.

**Co to stojí:**

- Všechny odkazy do aplikace musí jít na `/app/...` (ne na `/onboarding` přímo z marketingových stránek).  
- Nutnost přesunout app routes pod `/app` a nastavit redirecty (např. `/onboarding` → `/app/onboarding` 302), aby staré odkazy fungovaly.

**Rizika:**

- Pokud někde zůstane odkaz na `kitloop.cz/onboarding` (bez prefixu `/app`), tato URL zůstane na stejné doméně; je potřeba ji buď 302 přesměrovat na `/app/onboarding`, nebo také vystavit noindex (např. pravidlo pro `/onboarding` v headers). **Doporučení:** Přesměrovat `/onboarding`, `/login`, `/provider/*` atd. na `/app/...` a mít noindex pouze pro `/app/*` – pak není třeba noindex na mnoha path prefixech.

Alternativa: **VARIANTA A (app.kitloop.cz)** – vhodná až po pilotu, když chcete čisté oddělení (např. vlastní GSC property pro app) a jste ochotni řešit druhou site a DNS.

---

## C) Implementační kroky (nejmenší změna, low-regret)

### Varianta B (doporučená pro MVP)

| Čas | Krok |
|-----|------|
| **1–2 h** | 1) Přidat `public/robots.txt` (Disallow: /app, /onboarding, /login, /provider, /admin, /signup, /forgot-password, /reset-password, /demo; Allow: /). 2) Přidat `public/sitemap.xml` jen s marketing URL (/, /how-it-works, /about, /terms, /privacy). 3) V `netlify.toml` přidat [[headers]] for `/app/*` s `X-Robots-Tag: noindex, nofollow`. |
| **1 den** | 4) Zavedení `basename` pro app: React Router `basename="/app"`, všechny `<Link to="/onboarding">` v app části změnit na relativní nebo ponechat (basename je prefix). 5) Root `/` v Reactu nemá basename – musí servírovat marketing. **Problém:** Jeden build má jeden basename. Proto **alternativa bez basename**: root `/` renderuje marketing landing (nová route `/` → `<Index />`), a **vše app routes přesunout pod prefix** např. pod jednu „app“ route: např. `<Route path="/app" element={<AppShell />}><Route path="onboarding/*" .../><Route path="login" .../>...</Route>`. Tím pádem všechny app URL jsou `/app/onboarding`, `/app/login` atd. 6) Redirecty v `_redirects`: `/onboarding` → `/app/onboarding` 302, `/login` → `/app/login` 302, `/provider/*` → `/app/provider/*` 302 atd., aby staré odkazy fungovaly. 7) Marketing landing na `/`: už ne `<Navigate to="/onboarding"/>`, ale `<Index />` (stávající Index stránka zkrácená na 1 větu + CTA „Požádat o pilot“ + „Otevřít aplikaci“ → `/app/onboarding`). |
| **1 týden** | 8) Ověřit v GSC, že žádná app URL není indexovaná. 9) Lighthouse na `/`: minimalizovat JS pro první view (lazy load zbytek). 10) Acceptance testy: redirect chain max 1 hop, žádné smyčky. |

**Poznámka k Basename:**  
Pokud nechcete měnit všechny cesty na `/app/onboarding` atd., lze místo toho **nepřesouvat routy**, ale pouze:  
- Root `/` změnit na marketing landing (Index).  
- Ponechat `/onboarding`, `/login`, `/provider/*` atd. jak jsou.  
- Nastavit **noindex po path prefixech** v Netlify: např. `X-Robots-Tag: noindex` pro `/*` a pak **výjimku** pro `/?*` (root s query), `/how-it-works`, `/about`, `/terms`, `/privacy`. Netlify to umí přes více [[headers]] bloků.  
Tím pádem **nemusíte zavádět `/app` do URL** – jen oddělíte „marketing“ vs „app“ pomocí headers a robots.txt. To je **ještě menší změna**: žádný basename, žádné přesměrování cest, jen landing na `/` + noindex na vše kromě vyjmenovaných marketing path.

**Doporučená nejmenší implementace (bez prefixu /app):**

- **Krok 1:** V `netlify.toml` přidat noindex pro všechny cesty **kromě** whitelistu marketing paths (/, /how-it-works, /about, /terms, /privacy). Např. v Netlify: jeden [[headers]] for `/*` s `X-Robots-Tag: noindex` a druhý for konkrétní path bez noindex (Netlify bere první match).  
- **Krok 2:** `robots.txt`: Allow jen tyto path, Disallow zbytek (nebo jednoduše Disallow pro /onboarding, /login, /provider, /admin, /signup, /forgot-password, /reset-password, /demo, /book).  
- **Krok 3:** Root `/` v Reactu: místo `<Navigate to="/onboarding"/>` zobrazit malý marketing landing (např. zkrácený Index s 1 větou + 2 CTA).  
- **Krok 4:** `sitemap.xml` jen s marketing URL.

Tím **nezískáte** URL pod `/app`, ale **získáte** oddělení indexace a funkční pilot s minimem změn.

---

## D) Seznam změn v repu (konkrétní soubory)

### Varianta B – minimální (bez /app prefixu; noindex po path)

| Soubor | Změna |
|--------|--------|
| `netlify.toml` | Přidat [[headers]] pro app path: např. `for = "/onboarding"`, `for = "/login"`, `for = "/provider/*"`, `for = "/admin/*"`, `for = "/signup"`, `for = "/forgot-password"`, `for = "/reset-password"`, `for = "/demo/*"`, `for = "/book/*"` s `X-Robots-Tag: noindex, nofollow`. (Netlify neumí „vše kromě …“, takže vyjmenovat app prefixy.) Nebo jeden blok `for = "/*"` s noindex a druhý blok pro každou marketing path s přepsáním (např. `for = "/"` bez noindex – viz Netlify docs). |
| `public/robots.txt` | Nový soubor: User-agent: * / Disallow: /onboarding /login /provider /admin /signup /forgot-password /reset-password /demo /book /my-reservations /dashboard / Sitemap: https://kitloop.cz/sitemap.xml (Allow: / pro root; Disallow pro zbytek dle výběru). |
| `public/sitemap.xml` | Nový soubor: seznam pouze /, /how-it-works, /about, /terms, /privacy. |
| `src/App.tsx` | Změnit `<Route path="/" element={<Navigate to="/onboarding" replace />} />` na `<Route path="/" element={<Index />} />` (nebo novou lehkou landing komponentu). V Index.tsx upravit CTA: primární „Požádat o pilot“ (např. mailto nebo /request-link), sekundární „Otevřít aplikaci“ → `/onboarding`. |
| `index.html` | Pro marketing: canonical může zůstat ne nebo přidat `<link rel="canonical" href="https://kitloop.cz/">` pro root. Title/description už jsou. |

### Varianta B – s prefixem /app (plná)

- `public/_redirects`: přidat řádky např. `/onboarding  /app/onboarding  302`, `/onboarding/*  /app/onboarding/:splat  302`, `/login  /app/login  302`, `/provider  /app/provider  302`, `/provider/*  /app/provider/:splat  302`, atd.  
- `netlify.toml`: headers pro `/app/*` → `X-Robots-Tag: noindex, nofollow`.  
- `public/robots.txt`: Disallow: /app. Sitemap jen marketing.  
- `src/App.tsx`: použít `<BrowserRouter basename="/app">` pouze pro app routy – to vyžaduje dva stromy rout (jeden pro marketing bez basename, jeden s basename) nebo jednu aplikaci s basename="/app" a root `/` řešený na úrovni Netlify (root jako statická HTML nebo rewrite na jinou cestu). Komplikovanější; pro MVP doporučuji **minimální variantu bez /app** výše.

### Varianta A (app.kitloop.cz)

- Druhá Netlify site (např. „kitloop-app“), build ze stejného repa s env např. `VITE_APP_BASE=/` (pro app deploy).  
- Doména: app.kitloop.cz → přiřadit k této site.  
- V app site: `netlify.toml` [[headers]] for `/*` → `X-Robots-Tag: noindex, nofollow`.  
- Hlavní site kitloop.cz: root `/` = marketing (buď samostatný statický landing, nebo SPA s routou `/` = landing a bez app rout; app routy by byly jen na app.kitloop.cz).  
- Cookie: nastavit Supabase/auth cookie domain na `.kitloop.cz` pokud je třeba sdílet přihlášení mezi kitloop.cz a app.kitloop.cz.  
- V repu: buď dva build příkazy / dva publish dirs (marketing vs app), nebo jeden build s basename a na kitloop.cz servírovat jen vybrané soubory (složitější). **Prakticky:** Nejčistší je monorepo se dvěma Vite apps (marketing = malý site, app = stávající SPA) a dvě Netlify sites.

---

## E) Rizika a ošetření (auth, co může prasknout)

| Riziko | Ošetření |
|--------|----------|
| **Auth cookies po změně domény** | Varianta B: žádná změna domény. Varianta A: nastavit cookie domain na `.kitloop.cz` v Supabase Auth / cookie options. |
| **Redirect smyčka** | Redirecty v _redirects: pouze 302 z konkrétních path na cílové; root `/` nikdy neredirectovat na /onboarding v Netlify (jen v Reactu byl redirect – po změně root renderuje landing). |
| **Staré odkazy (e-maily, záložky) na /onboarding** | Varianta B minimální: /onboarding zůstává, jen noindex. Varianta B s /app: _redirects `/onboarding` → `/app/onboarding` 302. |
| **GSC stále indexuje app stránky** | Po nasazení v GSC „Remove URL“ pro problematické; dlouhodobě držet X-Robots-Tag a robots.txt konzistentní. |
| **Lighthouse/CWV na root** | Root landing by neměl načítat celý SPA bundle; ideálně lazy load app rout nebo oddělit marketing jako lehkou stránku (např. samostatná entry pro marketing). Pro MVP stačí, když root je stávající Index s minimem sekcí. |

---

## Acceptance criteria (shrnutí)

- [ ] GSC nebude indexovat žádnou app URL (buď app.kitloop.cz celé, nebo /app/* resp. vyjmenované app path s noindex).  
- [ ] Root `/` je marketing landing (200 OK), má meta title a description.  
- [ ] `/onboarding` zůstává funkční (buď na stejné URL s noindex, nebo 302 na `/app/onboarding`).  
- [ ] Redirect chain max 1 hop, žádné smyčky.  
- [ ] Lighthouse/CWV: marketing landing není zbytečně JS-heavy (minimálně lazy load pro ne‑root cesty).

---

## Production verification report (indexace fix)

**Datum ověření (před fixem):** 2026-03-03

### 1) Realita v produkci (curl)

```bash
curl -sI https://kitloop.cz/robots.txt
```
- Status: 200  
- Content-Type: `text/plain; charset=UTF-8` ✓  
- (robots.txt nezačíná `<!doctype html` ✓)

```bash
curl -s https://kitloop.cz/robots.txt | head -n 10
```
- Obsah: více řádků `User-agent: Googlebot`, `User-agent: Bingbot`, `User-agent: Twitterbot`, `User-agent: facebookexternalhit`, `Allow: /` — **bez řádku `Sitemap: https://kitloop.cz/sitemap.xml`** v prvních 10 řádcích (produkce = starší/odlišný deploy).

```bash
curl -sI https://kitloop.cz/sitemap.xml
```
- Status: 200  
- Content-Type: **`text/html; charset=UTF-8`** ✗ (mělo by být application/xml nebo text/xml)

```bash
curl -s https://kitloop.cz/sitemap.xml | head -n 10
```
- Obsah: **`<!DOCTYPE html>`** … (SPA shell) ✗ — sitemap.xml v produkci **není XML**.

**Acceptance před fixem:** robots.txt = text/plain ✓; robots.txt neobsahoval Sitemap: (v zobrazené části); sitemap.xml = HTML ✗, nezačíná `<?xml` ✗.

### Curl – hlavičky (před fixem)

| URL | Content-Type | Očekávání |
|-----|--------------|-----------|
| `https://kitloop.cz/robots.txt` | text/plain; charset=UTF-8 | ✓ |
| `https://kitloop.cz/sitemap.xml` | **text/html** | ✗ (application/xml nebo text/xml) |
| `https://kitloop.cz/onboarding` | text/html | — |
| `https://kitloop.cz/login` | text/html | — |

**Závěr:** robots.txt je text, ale bez řádku Sitemap (podle aktuálního deploye). sitemap.xml vrací SPA rewrite (index.html) → **root cause: v _redirects vyhrává catch-all `/*` před servírováním statického souboru, nebo deploy nemá aktuální _redirects.**

### Before / After – 10 nejrizikovějších URL

| URL | Před | Po (cíl po deployi) |
|-----|------|------------------------|
| `/` | 200, indexovatelné | 200, indexovatelné (žádný noindex) |
| `/onboarding` | 200, indexovatelné | 200, **X-Robots-Tag: noindex, nofollow** |
| `/login` | 200, indexovatelné | 200, **X-Robots-Tag: noindex, nofollow** |
| `/signup` | 200, indexovatelné | 200, **X-Robots-Tag: noindex, nofollow** |
| `/provider/dashboard` | 200, indexovatelné | 200, **X-Robots-Tag: noindex, nofollow** |
| `/provider/*` | 200, indexovatelné | 200, **X-Robots-Tag: noindex, nofollow** |
| `/dashboard` | 200, indexovatelné | 200, **X-Robots-Tag: noindex, nofollow** |
| `/admin/*` | 200, indexovatelné | 200, **X-Robots-Tag: noindex, nofollow** |
| `/how-it-works` | 200, indexovatelné | 200, indexovatelné (žádný noindex) |
| `/about`, `/terms`, `/privacy` | 200, indexovatelné | 200, indexovatelné (žádný noindex) |

### Provedené opravy (PR)

1. **`public/_redirects`** – explicitní pravidla nad catch-all: `/robots.txt` a `/sitemap.xml` → servírovat statický soubor (200); potom `/*` → `/index.html` 200. Netlify vyhodnocuje shora dolů, první match vyhrává.
2. **`public/robots.txt`** – odstraněny všechny `Disallow`. Ponecháno pouze: `User-agent: *`, `Allow: /`, `Sitemap: https://kitloop.cz/sitemap.xml`. Důvod: pokud robots.txt blokuje URL, Google je nemusí crawlovat a neuvidí `X-Robots-Tag: noindex` → riziko „URL-only indexed though blocked by robots“.
3. **`public/_headers`** – beze změny: na marketing routách (/, /how-it-works, /about, /terms, /privacy) není X-Robots-Tag; na app routách je `X-Robots-Tag: noindex, nofollow`.
4. **`public/sitemap.xml`** – beze změny: pouze marketing URL (/, /how-it-works, /about, /terms, /privacy), žádné app routy.

### 2) Build output (lokální ověření)

Po `npm run build` musí v publish složce (`netlify.toml` → `publish = "dist"`) existovat:

- `dist/robots.txt` ✓  
- `dist/sitemap.xml` ✓  
- `dist/_redirects` ✓  
- `dist/_headers` ✓  

Vite kopíruje `public/` do kořene `dist/`, takže všechny čtyři soubory jsou v artifactu. **Pokud by `dist/sitemap.xml` chyběl, příčina by byla v build pipeline (kopírování public assets).**

### 3) Sitemap + robots.txt – Root cause, fix, ověření

**Root cause (proč /sitemap.xml vracelo HTML)**

- Netlify zpracovává `_redirects` **shora dolů, první match vyhrává**.
- Pokud je v deployi jen řádek `/* /index.html 200`, pak **každá** URL (včetně `/sitemap.xml` a `/robots.txt`) matchuje catch-all a dostane index.html → Content-Type text/html.
- Produkce tedy buď: (a) neměla v deployi explicitní pravidla pro `/robots.txt` a `/sitemap.xml`, nebo (b) měla špatné pořadí (catch-all před konkrétními cestami).  
- `robots.txt` v produkci vracel text/plain, protože Netlify **může** servírovat existující statický soubor z publish dir, pokud na něj není rewrite – ale `/sitemap.xml` stejně skončil u catch-all, takže se vrátil index.html.

**Fix (co se změnilo)**

1. **`public/_redirects`** – přesně 3 řádky, **bez komentářů**, konkrétní pravidla **nad** catch-all:
   - `/robots.txt    /robots.txt    200`
   - `/sitemap.xml   /sitemap.xml   200`
   - `/*             /index.html    200`
2. **`public/robots.txt`** – minimální obsah: `User-agent: *`, `Allow: /`, `Sitemap: https://kitloop.cz/sitemap.xml`. Žádné extra User-agent řádky.

**How to verify (po redeployi na Netlify)**

Spustit znovu curl z bodu 1):

```bash
curl -sI https://kitloop.cz/robots.txt
curl -s  https://kitloop.cz/robots.txt | head -n 10
curl -sI https://kitloop.cz/sitemap.xml
curl -s  https://kitloop.cz/sitemap.xml | head -n 10
```

**Acceptance checklist (sitemap + robots)**

- **A)** `/robots.txt` = `Content-Type: text/plain`, obsah **nezačíná** `<!doctype html`, **obsahuje** řádek `Sitemap: https://kitloop.cz/sitemap.xml`.
- **B)** `/sitemap.xml` = `Content-Type: application/xml` nebo `text/xml`, obsah **začíná** `<?xml` a **není** HTML.

Pokud po deployi `/sitemap.xml` stále vrací HTML: zkontrolovat, že v Netlify se deployuje správný artifact (publish = `dist`) a že `dist/_redirects` obsahuje tyto 3 řádky v tomto pořadí.

---

### Acceptance criteria (po deployi – ověření)

- **A)** `/robots.txt` vrací `Content-Type: text/plain`, obsah není HTML, obsahuje `Sitemap:`.
- **B)** `/sitemap.xml` vrací XML (`Content-Type: application/xml` nebo `text/xml`), obsah není HTML, začíná `<?xml`.
- **C)** App routy (např. `/onboarding`, `/login`, `/provider/*`, `/dashboard/*`) vrací hlavičku `X-Robots-Tag: noindex, nofollow`.
- **D)** Marketing routy (`/`, `/how-it-works`, `/about`, `/terms`, `/privacy`) **ne**vrací `X-Robots-Tag: noindex`.
- **E)** Redirect chain: žádné smyčky; `/` a app routy jsou 200 OK (SPA), app routy s noindex.
- **F)** Sitemap obsahuje jen marketing routy.

**Příkazy pro ověření po deployi:**

```bash
curl -sI https://kitloop.cz/robots.txt    # očekáván content-type: text/plain
curl -sI https://kitloop.cz/sitemap.xml   # očekáván content-type: application/xml nebo text/xml
curl -s https://kitloop.cz/robots.txt | head -5   # nesmí začínat <!doctype, musí obsahovat Sitemap:
curl -s https://kitloop.cz/sitemap.xml | head -5 # musí začínat <?xml, ne <!doctype
curl -sI https://kitloop.cz/              # bez X-Robots-Tag
curl -sI https://kitloop.cz/onboarding    # X-Robots-Tag: noindex, nofollow
curl -sI https://kitloop.cz/login         # X-Robots-Tag: noindex, nofollow
curl -sI https://kitloop.cz/how-it-works  # bez X-Robots-Tag
```

---

## Dev tickets – provedené / připravené změny (Varianta B minimální)

### Soubory změněné / přidané v repu

| Soubor | Akce |
|--------|------|
| `docs/url-architecture-seo-mvp.md` | **Přidán** – tento dokument (mapa, doporučení, plán, rizika). |
| `public/_headers` | **Přidán** – X-Robots-Tag: noindex, nofollow pro všechny app path (/onboarding, /login, /provider/*, /admin/*, /demo/*, /book/*, atd.). Marketing path (/, /how-it-works, /about, /terms, /privacy) nemají záznam = indexovatelné. |
| `public/robots.txt` | **Upraven** – pouze `User-agent: *`, `Allow: /`, `Sitemap: …`. Žádné Disallow (aby crawler mohl na app URL a uviděl noindex). |
| `public/_redirects` | **Upraven** – explicitní `/robots.txt` a `/sitemap.xml` nad catch-all `/*` → `/index.html`, aby sitemap nebyl přepsaný na HTML. |
| `public/sitemap.xml` | **Přidán** – jen marketing URL: /, /how-it-works, /about, /terms, /privacy. |
| `src/App.tsx` | **Upraven** – `<Route path="/" element={<Navigate to="/onboarding" replace />} />` → `<Route path="/" element={<Index />} />`. Root tedy vrací marketing (Index), ne redirect na /onboarding. |

### Volitelné následné úpravy

- **Landing copy:** Pokud chcete na root jen „1 věta + CTA Požádat o pilot + Otevřít aplikaci“, nahraďte na `/` komponentu `Index` novou lehkou `Landing.tsx` nebo zkraťte obsah `Index` a upravte CTA v i18n (hero.primaryCta → /request-link, hero.secondaryCta → /onboarding).  
- **/request-link:** V aktuálním robots.txt už nejsou žádné Disallow. Pro indexovatelnou stránku „Požádat o pilot“ není třeba měnit.  
- **Canonical:** V `index.html` lze přidat `<link rel="canonical" href="https://kitloop.cz/">` pro root (SPA má jeden HTML; pro více marketing stránek by bylo potřeba dynamické canonical v komponentách).

---

## PR popis (zkopírovat do PR)

**fix(seo): indexace a URL architektura – marketing indexovatelný, app noindex**

**Co bylo rozbité**
- `/sitemap.xml` vracel HTML (SPA catch-all `/*` → `/index.html`), takže sitemap nebyl platný XML.
- `robots.txt` obsahoval Disallow pro app routy → Google mohl blokovat crawl na tyto URL a nevidět na nich `X-Robots-Tag: noindex` (riziko „URL-only indexed though blocked by robots“).
- Marketing vs app oddělení záviselo jen na hlavičkách; routing pro robots/sitemap nebyl zajištěn.

**Co je opravené**
- `_redirects`: explicitní pravidla `/robots.txt` → `/robots.txt` 200 a `/sitemap.xml` → `/sitemap.xml` 200 **nad** catch-all `/*` → `/index.html` 200. Netlify bere první match.
- `robots.txt`: pouze `User-agent: *`, `Allow: /`, `Sitemap: https://kitloop.cz/sitemap.xml` (odstraněny všechny Disallow).
- `_headers` a `sitemap.xml` beze změny (noindex jen na app routách, sitemap jen marketing URL).

**Jak ověřit po deployi**
```bash
curl -sI https://kitloop.cz/robots.txt    # Content-Type: text/plain
curl -sI https://kitloop.cz/sitemap.xml   # Content-Type: application/xml nebo text/xml
curl -s https://kitloop.cz/sitemap.xml | head -3   # <?xml ...>, ne <!DOCTYPE html>
curl -sI https://kitloop.cz/onboarding     # X-Robots-Tag: noindex, nofollow
curl -sI https://kitloop.cz/              # bez X-Robots-Tag (indexovatelné)
```

---

## Sitemap + robots.txt – formát (200! + multi-line) a triage

### Report před / po (sitemap + robots fix)

**Před (produkce, před tímto PR):**

| Co | Výsledek |
|----|----------|
| `curl -sI https://kitloop.cz/sitemap.xml` | `content-type: text/html; charset=UTF-8` ✗ |
| `curl -s https://kitloop.cz/sitemap.xml \| head -3` | `<!DOCTYPE html>`, `<html lang="en">` ✗ |
| `curl -sI https://kitloop.cz/robots.txt` | `content-type: text/plain; charset=UTF-8` ✓ |
| `curl -s https://kitloop.cz/robots.txt \| head -5` | `User-agent: Googlebot`, `Allow: /`, `User-agent: Bingbot`… — bez řádku `Sitemap:` v prvních 5 ✗ |

**Změny v tomto PR:**

- **`public/_redirects`** – přesně 3 řádky (multi-line), bez komentářů. Pro `/robots.txt` a `/sitemap.xml` použit **`200!`** (force):
  - `/robots.txt   /robots.txt   200!`
  - `/sitemap.xml  /sitemap.xml  200!`
  - `/*            /index.html   200`
- **`public/robots.txt`** – přesně 3 řádky: `User-agent: *`, `Allow: /`, `Sitemap: https://kitloop.cz/sitemap.xml`.

**Build output (ověření multi-line):**

```bash
npm run build
sed -n '1,5p' dist/_redirects    # 3 řádky pravidel
sed -n '1,5p' dist/robots.txt    # 3 řádky
file dist/sitemap.xml            # XML 1.0 document text
```

**Po deployi – ověření:**

```bash
curl -sI https://kitloop.cz/sitemap.xml
curl -s https://kitloop.cz/sitemap.xml | head -n 3
curl -sI https://kitloop.cz/robots.txt
curl -s https://kitloop.cz/robots.txt | head -n 5
```

Acceptance: sitemap.xml = Content-Type text/xml nebo application/xml, obsah začíná `<?xml`. robots.txt = text/plain, obsahuje řádek `Sitemap: …`.

### Triage: pokud /sitemap.xml po deployi stále vrací HTML

1. **Deploy artifact v Netlify** (Browse deploy / Download deploy): v kořeni musí být `_redirects`, `sitemap.xml`, `robots.txt`. Pokud chybí, build nekopíruje `public/` do `dist/` správně.
2. **Site settings → Build & deploy:** Publish directory = `dist`. Ověřit, že UI nepřebíjí.
3. **Duplicitní redirecty:** V `netlify.toml` nemá být `[[redirects]]` přepisující `_redirects`. V Netlify UI → Redirects zkontrolovat, že nejsou pravidla matchující `/sitemap.xml` nebo `/*` vracející HTML.
