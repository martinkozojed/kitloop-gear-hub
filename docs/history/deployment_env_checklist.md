# Deployment & Environment Checklist

Pre-onboarding checklist: env vars, Supabase redirect URLs, and smoke commands.

---

## 1. Netlify Environment Variables

Set these in **Netlify → Site → Environment variables** before deploying.

### Required (app will not start without these)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Recommended for production
- `VITE_SENTRY_DSN` — error tracking
- `VITE_ENABLE_DEMO` — set to `false` in production

### Feature flags (default `false`, leave unset or explicit)
- `VITE_ENABLE_ANALYTICS`
- `VITE_ENABLE_CRM`
- `VITE_ENABLE_ACCOUNTS`
- `VITE_ENABLE_MAINTENANCE`
- `VITE_ENABLE_CALENDAR`
- `VITE_ENABLE_MARKETPLACE`

### Auto-injected by Netlify build (do not set manually)
- `VITE_COMMIT_SHA` — injected from `$COMMIT_REF` at build time
- `VITE_BUILD_TIME` — injected at build time

### Never put in frontend env
- `SUPABASE_SERVICE_ROLE_KEY` — server-side only (Supabase Edge secrets)
- `STRIPE_SECRET_KEY` — server-side only (Supabase Edge secrets)
- `STRIPE_WEBHOOK_SECRET` — server-side only (Supabase Edge secrets)

---

## 2. Supabase Auth — URL Configuration (critical)

Set in **Supabase Dashboard → Authentication → URL Configuration**. If these are wrong, users can be sent to the wrong domain or localhost after login / magic link / password reset.

### Site URL
- **Production:** `https://kitloop.co` (primary domain; do not use kitloop.cz or Netlify subdomain here)
- Staging: your staging origin

### Redirect URLs (add all that apply)

Password reset and magic link callbacks must be allowed. The app sends users to exact paths (e.g. `/reset-password`, `/login`). `/**` covers everything, but for clarity you can also add the concrete paths:

- `http://localhost:5173/**` — local Vite dev
- `http://localhost:8080/**` — local preview / E2E
- `https://kitloop.co/**` — production (covers all callbacks)
- `https://kitloop.co/login` — login / OAuth return (optional if using `/**`)
- `https://kitloop.co/reset-password` — password reset callback (optional if using `/**`)
- `https://www.kitloop.co/**` — only if you ever use www as primary; otherwise 301 handles it
- `https://<your-netlify-site>.netlify.app/**` — only if you need to test deploy before custom domain

> If you use password reset or magic link, Redirect URLs must include the callbacks the app actually uses (e.g. `/reset-password`, `/login`). `/**` satisfies that; adding the exact paths above avoids “redirect not allowed” surprises.

---

## 3. Supabase Edge Function Secrets

Set via `supabase secrets set` (not in `.env`):

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY` (auto-available in Edge Functions, but verify if needed)

---

## 4. Smoke Before Onboarding

Run these locally (or in CI) before inviting a partner:

```bash
# Type check — zero errors required
npx tsc --noEmit

# Lint — zero critical errors required
npm run lint

# Production build — must succeed
npm run build
```

All three must pass cleanly. If any fail, do not proceed with onboarding.

---

## 5. Quick Deployment Sanity

After deploying to Netlify:

- [ ] **Netlify Domain settings:** Primary domain is **apex** `kitloop.co` (not www), so it matches the 301 rules in `netlify.toml`.
- [ ] App loads at production URL (no blank screen, no console errors).
- [ ] Login page renders and auth flow completes.
- [ ] `VITE_SUPABASE_URL` points to the production Supabase project (not `127.0.0.1`).
- [ ] No `SERVICE_ROLE_KEY` visible in browser network tab or JS bundle.
- [ ] Supabase Edge Functions deployed: `admin_action`, `reserve_gear`, `cleanup_reservation_holds`.

---

## 6. Post-deploy: final “GO” — domains and SEO

When you want definitive confirmation that domains and SEO are correct, run these six checks:

```bash
curl -I http://kitloop.co
curl -I https://www.kitloop.co
curl -I https://kitloop.cz/some-path
curl -I http://kitloop.cz/some-path
curl -I https://kitloop.co/sitemap.xml
curl -I https://kitloop.co | grep -i robots
```

**Expected:**

| Check | Expected |
|-------|----------|
| First 4 (http://kitloop.co, www, .cz HTTPS, .cz HTTP) | **301** → `Location: https://kitloop.co/...` |
| sitemap.xml | **200** (real sitemap, not index.html) |
| grep robots | **Empty** (no `x-robots-tag: noindex` on .co) |

If any of the first four returns 200 or a different Location, domain redirects are wrong (check Netlify redirect order; do not add `public/_redirects`). If sitemap returns HTML, the SPA fallback is catching it. If grep shows `noindex`, remove it from Netlify headers for the production domain.

**Gotcha — Netlify CDN cache vs redirect changes:** Redirects from `netlify.toml` take effect only after a new deploy, and at the edge they can briefly differ due to cache. If `curl -I` shows old behavior (e.g. no 301, or wrong Location), try: (1) testing with a **random path** (e.g. `/some-path-$(date +%s)`) so the request bypasses cache, or (2) running the same checks again **after a redeploy**. That avoids false negatives from cached redirect responses.

### Well-known (optional one-off)

If you add Apple/Google verification or `security.txt` under `/.well-known/`, confirm the SPA fallback does not swallow them:

```bash
# After adding e.g. public/.well-known/security.txt or apple-app-site-association
curl -I https://kitloop.co/.well-known/security.txt
```

**Expected:** 200 and correct `Content-Type` (or 404 if the file is not added yet). If you get 200 with `index.html` content, the `/.well-known/*` rewrite in `netlify.toml` is not applied — check rule order. In `netlify.toml` there is a `[[headers]]` for `/.well-known/*` with `Cache-Control: no-store` so verification responses are not cached and delays are avoided; add per-file `Content-Type` in Netlify UI if a tool expects a specific type.

---

## 7. Search Console migration (after domain switch)

After the technical migration to kitloop.co is live:

- [ ] **Google Search Console:** Prefer a **Domain property** (e.g. `kitloop.co`, `kitloop.cz`) when available — it covers apex, www, and http/https in one. Otherwise use URL-prefix properties for `https://kitloop.co` (and optionally `https://www.kitloop.co`).
- [ ] Use **Change of Address** from the old .cz property to the new .co property (conditions apply; Google sometimes guides via domain-level).
- [ ] Resubmit or re-check sitemap indexation for the new domain (`https://kitloop.co/sitemap.xml`).

---

## 8. One-off browser check (real state after deploy)

Besides `curl -I`, open these in a browser once after deploy. If redirects look wrong, remember **Netlify CDN cache** (§6 gotcha): use a unique path or retest after a redeploy.

| URL | Expect |
|-----|--------|
| https://kitloop.cz/ | Redirects to **https://kitloop.co/** (address bar shows .co). |
| https://kitloop.co/sitemap.xml | **XML** (sitemap), not HTML. If you see the app shell, SPA fallback is catching it. |
| https://kitloop.co/.well-known/security.txt | **404** is OK if the file is not added yet. Must **not** be HTML (index.html from fallback). In `netlify.toml` the rewrite `/.well-known/*` → `/.well-known/:splat` 200 is defined **above** the SPA fallback `/*` → `/index.html`, so this check will hold as long as that order is kept. |

**Cache (optional):** `netlify.toml` sets `Cache-Control: public, max-age=3600` for `/robots.txt` and `/sitemap.xml`. If you change them often, lower `max-age` or remove those header blocks.
