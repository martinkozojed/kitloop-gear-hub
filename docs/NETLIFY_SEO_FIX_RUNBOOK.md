# Netlify SEO fix runbook — C8 (noindex) a C4 (http→.cz 2-hop)

**Cíl:** Odstranit `X-Robots-Tag: noindex` z kitloop.co a (volitelně) zkrátit redirect chain pro `http://kitloop.cz` na 1 hop. Po provedení kroků spusť **Důkaz** a vlož výstupy do auditu.

---

## A) Oprava C8: odstranit noindex z produkční domény

1. **Netlify Dashboard** → vyber site → **Site configuration** (nebo **Build & deploy**).
2. **Build & deploy** → **Post processing**  
   - Pokud je tam položka typu „Add X-Robots-Tag“ nebo „noindex for …“, **odstraň ji** nebo ji omez jen na Deploy Previews (ne na Production).
3. **Build & deploy** → **Deploy Previews** / **Branch deploys**  
   - Ověř, že „Add noindex to deploy previews“ (nebo podobné) je **zapnuté jen pro preview**, ne pro Production. Production deploy nesmí dostat noindex.
4. **Deploys** → ověř, že aktuálně **Published** deploy je z **production branch** (typicky `main`).  
   - Site configuration → **Build & deploy** → **Continuous deployment** → **Production branch** = např. `main`.  
   - Pokud je publikovaný deploy z jiné větve (preview), vyber nejnovější deploy z production branch → **Publish deploy**.
5. Pokud nikde v UI nevidíš nastavení X-Robots-Tag, zkontroluj ještě:  
   - **Integrations** (některé pluginy přidávají headers),  
   - **Domain management** → HTTPS (někdy se tam dává noindex pro ne‑primary domény).

**Důkaz po opravě:**
```bash
curl -sI https://kitloop.co | grep -i robots
```
**Očekávání:** prázdný výstup (žádný řádek `x-robots-tag`).

---

## B) Oprava C4: http://kitloop.cz → ideálně 1 hop na https://kitloop.co

**Aktuální chování:**  
`http://kitloop.cz/*` → 301 na `https://kitloop.cz/*` (Force TLS) → 301 na `https://kitloop.co/*`. Celkem 2 hop; finální cíl je správně.

**Cíl:** 1 hop: `http://kitloop.cz/*` → 301 `https://kitloop.co/*`.

1. **Netlify** → Site → **Domain management** → **HTTPS** (nebo **SSL/TLS**).  
2. Najdi „Force TLS“ / „Redirect HTTP to HTTPS“ / „Always use HTTPS“.  
3. **Preferovaná varianta:**  
   - Pokud je možnost „Redirect to primary domain“ nebo „Redirect HTTP to HTTPS using primary domain“, zapni ji (aby HTTP na alias doménách šel rovnou na primary).  
4. **Alternativa:**  
   - Dočasně **vypni** „Force TLS“ / „Always use HTTPS“ a spolehni se na pravidla v `netlify.toml` (tam jsou explicitní 301 pro `http://kitloop.cz/*` a `http://www.kitloop.cz/*` na `https://kitloop.co/:splat`).  
   - Ověř, že po vypnutí máš stále HTTPS na kitloop.co (certifikát zůstává; pouze se změní pořadí redirectů).  
5. **Poznámka:** Pokud necháš 2-hop (Force TLS zapnuté), je to **akceptovatelné** pro GO, pokud finální `Location` je vždy `https://kitloop.co/<path>`.

**Důkaz (1-hop):**
```bash
curl -sIL "http://kitloop.cz/some-path-$(date +%s)" | sed -n '1,20p'
```
**Očekávání:** první odpověď je 301 s `Location: https://kitloop.co/...`.

**Důkaz (min. akceptovatelné, 2-hop):**
```bash
curl -sIL "http://kitloop.cz/some-path-$(date +%s)" 2>&1 | grep -i location
```
**Očekávání:** poslední `Location:` je `https://kitloop.co/...`.

---

## C) Bonus C10: security.txt (200, ne HTML)

V repu je soubor `public/.well-known/security.txt`. Aby byl na produkci 200 a text/plain:

1. Ověř, že v repu existuje `public/.well-known/security.txt`.  
2. Spusť nový **production deploy** (push do production branch nebo „Trigger deploy“ v Netlify).  
3. Po dokončení deploye:
```bash
curl -sI https://kitloop.co/.well-known/security.txt
curl -s https://kitloop.co/.well-known/security.txt | head -5
```
**Očekávání:** 200, `content-type: text/plain` (ne `text/html`), tělo nezačíná `<!DOCTYPE`.

---

## D) Finální GO testy (vše musí projít)

Po provedení A (a volitelně B a C) spusť a ulož výstupy:

```bash
# 1) Redirects
curl -sI http://kitloop.co
curl -sI https://www.kitloop.co/some-path-123
curl -sI https://kitloop.cz/some-path-123
curl -sI http://www.kitloop.cz/some-path-123

# 2) robots + sitemap
curl -sI https://kitloop.co/robots.txt
curl -s https://kitloop.co/robots.txt
curl -sI https://kitloop.co/sitemap.xml
curl -s https://kitloop.co/sitemap.xml | head -6

# 3) Noindex
curl -sI https://kitloop.co | grep -i robots
```

**Kritéria GO:**
- Všechny redirecty (kromě https://kitloop.co samotného) dávají **301** a **Location: https://kitloop.co/<stejná cesta>** (příp. po max 2–3 hopech).
- robots.txt: **200**, obsahuje `Sitemap: https://kitloop.co/sitemap.xml`.
- sitemap.xml: **200**, XML (ne HTML).
- `curl -sI https://kitloop.co | grep -i robots` → **prázdný výstup**.

---

## Stav repa (bez změn v Netlify UI)

- **netlify.toml:** Žádný `X-Robots-Tag`; pravidla pro `http://kitloop.cz/*` a `http://www.kitloop.cz/*` → `https://kitloop.co/:splat` 301 jsou nastavená (řádky 36–43).
- **public/.well-known/security.txt:** Existuje; po production deployi má být na produkci 200 a text/plain.
