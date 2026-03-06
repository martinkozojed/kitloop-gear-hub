# SEO / Domain migration audit: kitloop.cz → kitloop.co

**Date:** 2026-03-03  
**Scope:** Repo config, build output, production HTTP (curl), internal links, risk flags.  
**Primary domain:** https://kitloop.co (apex, no www).

---

## 1) CHECKLIST

| # | Check | Expected | Observed | PASS/FAIL | Evidence |
|---|--------|----------|----------|-----------|----------|
| A1 | `public/_redirects` does not exist | No file | 0 files found (glob `**/_redirects`) | **PASS** | `glob_file_search **/_redirects` → no matches |
| A2 | Redirect order: 1) domain 301s | 301, force=true, kitloop.cz + www + http variants | netlify.toml L24–58: 7 rules, all status=301 force=true | **PASS** | netlify.toml:24-58 |
| A3 | Redirect order: 2) robots/sitemap 200 | /robots.txt, /sitemap.xml → self, 200 | L61–67: from/to self, status=200 | **PASS** | netlify.toml:60-67 |
| A4 | Redirect order: 3) .well-known above SPA | /.well-known/* → /.well-known/:splat 200 | L70–74, before /* L76–79 | **PASS** | netlify.toml:69-79 |
| A5 | Redirect order: 4) SPA last | /* → /index.html 200 | L76–79 | **PASS** | netlify.toml:76-79 |
| A6 | Headers: .well-known Cache-Control | no-store | for=/.well-known/*, Cache-Control=no-store | **PASS** | netlify.toml:89-94 |
| A7 | Headers: robots/sitemap cache (optional) | max-age=3600 or similar | for=/robots.txt, /sitemap.xml, max-age=3600 | **PASS** | netlify.toml:96-104 |
| B1 | dist/robots.txt exists after build | File present | Present, 63 bytes | **PASS** | `ls dist/robots.txt` + build log |
| B2 | dist/sitemap.xml exists after build | File present | Present, 356 bytes | **PASS** | `ls dist/sitemap.xml` |
| B3 | Sitemap URLs only https://kitloop.co | No .cz, no http | All `<loc>` are https://kitloop.co/terms, /privacy | **PASS** | dist/sitemap.xml + public/sitemap.xml |
| C1 | http://kitloop.co → 301 to https://kitloop.co | Location: https://kitloop.co/ | 301, Location: https://kitloop.co/ | **PASS** | curl -sI http://kitloop.co |
| C2 | https://www.kitloop.co/some-path-123 → 301 | Location: https://kitloop.co/some-path-123 | 301, Location: https://kitloop.co/some-path-123 | **PASS** | curl -sI https://www.kitloop.co/some-path-123 |
| C3 | https://kitloop.cz/some-path-123 → 301 | Location: https://kitloop.co/some-path-123 | 301, Location: https://kitloop.co/some-path-123 | **PASS** | curl -sI https://kitloop.cz/some-path-123 |
| C4 | http://kitloop.cz/some-path-123 → 301 to .co | Location: https://kitloop.co/some-path-123 | 301, Location: **https://kitloop.cz/some-path-123** | **FAIL** | curl -sI http://kitloop.cz/some-path-123 |
| C5 | https://www.kitloop.cz/some-path-123 → 301 | Location: https://kitloop.co/some-path-123 | 301, Location: https://kitloop.co/some-path-123 | **PASS** | curl -sI https://www.kitloop.cz/some-path-123 |
| C6 | robots.txt 200, text/plain, Sitemap .co | 200, Sitemap: https://kitloop.co/sitemap.xml | 200, content-type: text/plain, body has Sitemap: https://kitloop.co/sitemap.xml | **PASS** | curl -sI + curl -s https://kitloop.co/robots.txt |
| C7 | sitemap.xml 200, XML not HTML | 200, application/xml or text/xml | 200, content-type: application/xml, body <?xml | **PASS** | curl -sI + curl -s https://kitloop.co/sitemap.xml |
| C8 | kitloop.co: no X-Robots-Tag noindex | No such header | **x-robots-tag: noindex, nofollow** present | **FAIL** | curl -sI https://kitloop.co \| grep -i robots |
| C9 | kitloop.co HTML: no meta robots noindex | No meta name=robots noindex | No such meta in index.html (only comment) | **PASS** | index.html L1–33; curl -s https://kitloop.co \| head -80 |
| C10 | /.well-known/security.txt not SPA HTML | 404 OK; if 404, body must not be HTML | 404, **content-type: text/html**, body <!DOCTYPE html | **FAIL** | curl -sI + curl -s https://kitloop.co/.well-known/security.txt |
| C11 | .well-known Cache-Control when served | no-store | (N/A when 404) 404 response had cache-control: no-store | **PASS** | curl -sI .well-known/security.txt |
| D1 | No user-facing kitloop.cz site URL in client | Only mailto/contact OK | Only support@kitloop.cz, hello@kitloop.cz (mailto/contact) | **PASS** | grep kitloop.cz in src/ — only emails |
| E1 | No global X-Robots-Tag in repo | Not in netlify.toml | Not in netlify.toml | **PASS** | grep -r noindex/X-Robots netlify.toml → none |
| E2 | No hard-coded canonical on / in index | No canonical to / only | No canonical/og:url (comment only) | **PASS** | index.html L11–12 |
| E3 | RequestLink noindex is per-route only | Not on homepage | Only on RequestLink page, cleanup on unmount | **PASS** | src/pages/RequestLink.tsx:50–61 |

---

## 2) FAIL root cause + minimal fix + verification

### FAIL C4: http://kitloop.cz → Location https://kitloop.cz (should be https://kitloop.co)

- **Root cause:** Netlify’s “Force HTTPS” (or equivalent) likely runs before our redirect rules and turns `http://kitloop.cz` → `https://kitloop.cz` (same host). Our rule `from = "http://kitloop.cz/*"` in netlify.toml is correct but may never see the request if the platform normalizes HTTP→HTTPS first on the host.
- **Minimal fix (platform):** In **Netlify Dashboard** → Site → **Domain management** / **HTTPS**: ensure redirect to “primary domain” (kitloop.co), not “same host”. If there is “Redirect HTTP to HTTPS” or “Force HTTPS”, check whether it can be set to “redirect to primary domain” so that `http://kitloop.cz` goes to `https://kitloop.co`. If not, open a Netlify support question: “We need http://kitloop.cz to 301 to https://kitloop.co, but currently it 301s to https://kitloop.cz.”
- **Verification:**  
  `curl -sI "http://kitloop.cz/some-path-$(date +%s)"`  
  Expect: `Location: https://kitloop.co/...` and 301. If still `.cz`, retry after cache expiry or redeploy; if still wrong, fix is in Netlify UI/support.

### FAIL C8: kitloop.co returns X-Robots-Tag: noindex, nofollow

- **Root cause:** Header is not in the repo (netlify.toml has no X-Robots-Tag for `/*`). It is set in **Netlify UI** (e.g. Post processing, or Headers in Build & deploy).
- **Minimal fix:** In **Netlify** → Site → **Build & deploy** → **Post processing** (or **Headers**): find any rule that sets `X-Robots-Tag: noindex` (or “noindex, nofollow”) for the site and **remove** it for the production domain (kitloop.co). Do not add this header in netlify.toml.
- **Verification:**  
  `curl -sI https://kitloop.co | grep -i robots`  
  Expect: empty (no x-robots-tag line).

### FAIL C10: /.well-known/security.txt returns 404 with HTML body

- **Root cause:** Rewrite `/.well-known/*` → `/.well-known/:splat` 200 is in place, but when the file is missing Netlify falls through and serves the SPA (or custom 404 page), so the response is 404 with `content-type: text/html` and HTML body. Requirement: “404 je OK, ale nesmí to být HTML.”
- **Minimal fix (recommended):** Add a real file so the path is not served by SPA and does not return HTML. Create `public/.well-known/security.txt` with minimal valid content (e.g. IETF draft format). Then the same URL will return 200, text/plain, and no HTML.

```diff
# New file: public/.well-known/security.txt
+ # https://kitloop.co
+ Contact: mailto:support@kitloop.cz
+ Expires: 2027-01-01T00:00:00.000Z
```

- **Acceptance:**  
  - `curl -sI https://kitloop.co/.well-known/security.txt` → 200, `content-type: text/plain` (or similar).  
  - `curl -s https://kitloop.co/.well-known/security.txt | head -1` → first line is comment or Contact, not `<!DOCTYPE`.

---

## 3) Google Search Console (instrukce bez přístupu)

- **Přidat property pro novou doménu:**  
  Search Console → Přidat vlastnost → **Domain** (doporučeno) → zadej `kitloop.co`. Ověř vlastnictví (DNS TXT nebo přes poskytovatele domény). Domain property pokryje apex i www i http/https.
- **Change of Address:**  
  Ve staré property (kitloop.cz) → Nastavení → **Změna adresy** → vyber novou property (kitloop.co). Splň podmínky (ověření obou, žádné závažné problémy na .cz). Google pak přesune signál na .co.
- **Sitemap:**  
  V nové property (kitloop.co) → Sitemapy → Odešli `https://kitloop.co/sitemap.xml`. Zkontroluj indexaci po několika dnech.
- **Kontrola indexace:**  
  Po změně adresy zkontroluj, že v GSC pro kitloop.co roste počet indexovaných URL a že nejsou hromadně “noindex” nebo “Discovered – currently not indexed” kvůli noindex. Po odstranění X-Robots-Tag (FAIL C8) by se to mělo zlepšit.

---

## 4) Acceptance criteria (GO) — stav

| Criterion | Status |
|-----------|--------|
| Všechny varianty .cz a www dávají 301 na https://kitloop.co/ se zachováním cesty | **FAIL** — http://kitloop.cz 301 na .cz |
| https://kitloop.co/robots.txt a /sitemap.xml vrací 200 a nejsou HTML | **PASS** |
| Na https://kitloop.co není noindex v headeru ani meta | **FAIL** — X-Robots-Tag: noindex v headeru (Netlify UI) |
| /.well-known/* nepadá do SPA fallbacku (404 OK, ale nesmí být HTML) | **FAIL** — 404 s HTML tělem |
| Konfigurace v jednom zdroji (netlify.toml), bez _redirects | **PASS** |

---

## 5) Verdikt

**NO-GO**

**Tři hlavní důvody:**

1. **http://kitloop.cz** dává 301 na **https://kitloop.cz**, ne na **https://kitloop.co** — migrace domény není kompletní pro HTTP požadavky na .cz; může to oddálit přenos signálu a plnou změnu adresy v GSC.
2. **https://kitloop.co** vrací **X-Robots-Tag: noindex, nofollow** (nastaveno v Netlify UI, ne v repu) — blokuje indexaci hlavní domény; musí se odstranit v Netlify.
3. **/.well-known/security.txt** vrací **404 s HTML tělem** (SPA/404 stránka) — nesplňuje požadavek “nesmí to být HTML”; doporučený fix: přidat `public/.well-known/security.txt` a ověřit 200 + text/plain.

Po nápravě C4 (Netlify redirect pro http .cz), C8 (odstranění noindex v Netlify) a C10 (well-known bez HTML odpovědi) bude migrace SEO-safe a lze ji označit za **GO**.
