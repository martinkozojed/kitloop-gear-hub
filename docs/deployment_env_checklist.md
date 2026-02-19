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

## 2. Supabase Redirect URLs

Set in **Supabase Dashboard → Authentication → URL Configuration**.

### Site URL
- Production: `https://<your-netlify-site>.netlify.app` (or custom domain)

### Redirect URLs (add all that apply)
- `http://localhost:5173/**` — local Vite dev
- `http://localhost:8080/**` — local preview / E2E
- `https://<your-netlify-site>.netlify.app/**` — production
- `https://<custom-domain>/**` — if using a custom domain

> The password-reset flow uses `window.location.origin + /reset-password` as the redirect target. Make sure the production origin is in this list.

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

- [ ] App loads at production URL (no blank screen, no console errors).
- [ ] Login page renders and auth flow completes.
- [ ] `VITE_SUPABASE_URL` points to the production Supabase project (not `127.0.0.1`).
- [ ] No `SERVICE_ROLE_KEY` visible in browser network tab or JS bundle.
- [ ] Supabase Edge Functions deployed: `admin_action`, `reserve_gear`, `cleanup_reservation_holds`.
