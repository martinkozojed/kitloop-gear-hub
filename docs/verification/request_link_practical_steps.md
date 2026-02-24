# Request Link – praktický postup po změnách

## 1. Migrace a ověření DB

```bash
supabase db push
```

Potom spusť ověřovací skript (v transakci s ROLLBACK, nic nemění):

```bash
psql -U postgres -d postgres -f docs/verification/request_link_hardening_verify.sql
```

Očekávaný výstup: `Request Link hardening verification passed.`

## 2. Typy a build

```bash
supabase gen types typescript --local > src/integrations/supabase/types.ts
npm run build
```

(Zkontroluj, že se chytí nové sloupce např. `rejected_at`, `request_link_created_at`.)

## 3. E2E / smoke

- **429 + Retry-After:** Po překročení limitu (např. 6× rychle za sebou submit na stejný token) očekávej 429 a hlavičku `Retry-After`.
- **Create → refresh → convert:** Submit request → provider vidí v Poptávkách → „Vytvořit rezervaci“ → refresh na `/new?fromRequest=...` → formulář stále předvyplněn → odeslání → request zmizí z pending, navigace na detail rezervace.
- **Double convert / double reject:** Dva taby na stejný request; v jednom convert, ve druhém znovu convert → idempotentní (stejná rezervace). Dva taby, v obou reject → první OK, druhý „již zpracována“.

## 4. Rate limit a IP (pro deploy)

- **RATE_LIMIT_SALT:** Povinná proměnná v Edge env (tajná, min. 16 znaků, doporučeně 32+). Bez ní endpoint vrací 503. Nepoužívej veřejný fallback (SUPABASE_URL) – hash by byl odvozovatelný.
- **Headery:** Preferuje se `x-real-ip` nebo `cf-connecting-ip` (Cloudflare), jinak první položka z `x-forwarded-for` (trim). Ověř, že tvá platforma skutečně předává očekávané headery: `cf-connecting-ip` jen na Cloudflare; `x-real-ip` závisí na proxy (Nginx, Vercel, …). Do DB jde jen hash IP (žádné PII).
