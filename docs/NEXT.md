# M2 – Suggested Follow-up

- Přidat DB trigger, který ověří konzistenci `pricing_snapshot` vs. `amount_total_cents` při insert/update.
- Implementovat storno/refund flow (Stripe Refund API + audit log) včetně FE akce.
- Dokončit Admin Approvals MVP (seznam pending providers, approval funkce, audit trail).
- Zapojit pgTAP testy v CI (Self-hosted runner s Postgres + `supabase db remote commit`).
- E2E scénáře přes Playwright (rezervace, payment intent, webhook replay).
- Nastavit alerting: Sentry (Edge/FE) + PostHog/Plausible pro funnel.
- Rate limit per provider (např. kvóty pro create_payment_intent) + WAF pravidla.
- Data retention plán: log rotation, stripe_webhook_events cleanup.
- Dokumentovat Sentry/Supabase secrets v README + check-list pro release.
- Připravit staging smoke test skript (Stripe CLI + Supabase REST) pro předprodukční validaci.
