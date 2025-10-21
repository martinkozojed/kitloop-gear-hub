# M1 Status – Kitloop

| Oblast | Stav | Poznámka |
| --- | --- | --- |
| Rezervace (hold → confirm → cleanup) | Hotovo | Edge flow drží hold, Stripe PI a cleanup cron (*/5) uklízí expirované blokace. |
| RBAC / RLS + testy | Částečně | Membership funkce běží, pgTAP scénář existuje, ale CI zatím jen TODO (není DB runner). |
| Platby (Payment Intent + webhook) | Částečně | API + webhook idempotence dodána, čeká se na e2e test se Stripe CLI/staging. |
| Observabilita (Sentry) | Částečně | FE/Edge inicializace připravená – vyžaduje DSN v env a zapojení alertů. |
| CI (Deno + pgTAP) | Částečně | Deno testy se spouští, pgTAP krok zatím TODO, pipeline nepadají. |
| CSP / bezpečnostní hlavičky | Hotovo | Netlify hlavičky nastavené, komentáře pro Stripe.js/Sentry ingest připraveny. |
| Staging prostředí | NENALEZENO | Staging konfigurace (Supabase, Netlify, Stripe) není v repu – nutno založit podle RUNBOOK. |
