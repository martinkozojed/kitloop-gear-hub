# Úklid produkčního Supabase (kitloop.cz)

Krátký checklist pro bezpečné vyčištění testovacích účtů a dat. Detailní plán je v [.cursor/plans](../.cursor/plans) (úklid produkčního Supabase).

## Úplný reset přímo v SQL (bez .env)

Chceš-li smazat **všechna data** bez Node skriptu: otevři **Supabase Dashboard → SQL Editor**, zkopíruj obsah [scripts/supabase_reset_all_data.sql](../scripts/supabase_reset_all_data.sql) a spusť. Nejdřív nech na konci `ROLLBACK;` (ověříš, že dotazy proběhnou), pak změň na `COMMIT;` a spusť znovu. Tabulky a schéma zůstanou, smažou se jen řádky.

## Bezpečnostní pravidla

- **Pilot nesmí padnout.** Žádné mazání bez zálohy a bez předchozího dry-run.
- Vždy nejdřív spusť **část A** (pouze SELECT) v [scripts/supabase_prod_cleanup.sql](../scripts/supabase_prod_cleanup.sql) a zkontroluj výstup.
- Část B (DELETE) spouštěj až po **zálohování** a s vědomím, že jde o **nevratnou** akci.

## Checklist před mazáním

1. [ ] Jsi v **správném projektu** v Supabase Dashboard (produkce pro kitloop.cz).
2. [ ] **Záloha:** Dashboard → Database → Backups ověřeno, nebo ruční `pg_dump` proveden.
3. [ ] **Dry-run:** V SQL Editoru spuštěna celá **část A** skriptu, výstup zkontrolován (počty uživatelů, proviederů, řádků).
4. [ ] V části B je na konci zatím **ROLLBACK;** (ne COMMIT) – první běh jen ověří, že dotazy proběhnou.

## Po úklidu: nový admin

1. Registrace na **kitloop.cz** na tvůj hlavní e-mail.
2. V Supabase Dashboard → Authentication → Users najít svůj účet a zkopírovat `user_id` (UUID).
3. V SQL Editoru spustit (nahraď `TVŮJ_USER_ID`):

```sql
INSERT INTO public.profiles (user_id, role, is_admin)
VALUES ('TVŮJ_USER_ID', 'admin', true)
ON CONFLICT (user_id) DO UPDATE SET role = 'admin', is_admin = true;

INSERT INTO public.user_roles (user_id, role)
VALUES ('TVŮJ_USER_ID', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

4. V Dashboardu u uživatele (Authentication → Users → tvůj účet) v **User metadata** doplnit: `role: admin`, `is_admin: true` (aby RPC a JWT braly admina).
5. Ověřit přihlášení a přístup do admin sekce (např. schvalování proviederů).
