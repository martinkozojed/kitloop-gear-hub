# Nastavení notifikací na produkci

Pokud na produkčním Supabase projektu chybí tabulky notifikací (chyba `PGRST205` / `notification_outbox`), spusť jednou tento skript.

## Kroky

1. Otevři **Supabase Dashboard** → svůj **produkční projekt** (např. `bkyokcjpelqwtndienos`).
2. Jdi do **SQL Editor** → **New query**.
3. Zkopíruj celý obsah souboru `apply_notification_tables_production.sql` a vlož do editoru.
4. Klikni **Run** (nebo Ctrl+Enter).
5. Po úspěchu by měly existovat tabulky `notification_preferences`, `notification_outbox`, `notification_deliveries` a realtime pro `notification_outbox` bude zapnutý.

Skript je idempotentní – můžeš ho spustit i opakovaně (např. při aktualizaci politik).

## CSP (WebSocket) na Netlify

Aby prohlížeč povolil připojení na `wss://*.supabase.co`, musí v hlavičce být v `connect-src` i `wss://*.supabase.co`. V repozitáři je to už nastavené v `netlify.toml`. Po nasazení (push + build na Netlify) by mělo vše fungovat.

Pokud po deployi stále vidíš v konzoli „Refused to connect to wss://…“:

- V **Netlify** → Site settings → **Headers** (nebo **Security**) zkontroluj, jestli nemáš ručně nastavenou hlavičku **Content-Security-Policy**. Pokud ano, přidej do `connect-src` hodnotu `wss://*.supabase.co` nebo hlavičku odstraň a nech ji řídit jen z `netlify.toml`.
