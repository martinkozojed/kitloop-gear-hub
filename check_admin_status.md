# 🔍 JAK ZJISTIT, JDO JE ADMIN

## ❌ "Provider Admin" ≠ Platform Admin

**Co vidíte:** "Logged in as Provider Admin"  
**Co to znamená:** Jste správce providera (vaší půjčovny)  
**Co NEMŮŽETE:** Schvalovat jiné providery (admin_action endpoint)

---

## 🔎 JAK ZKONTROLOVAT, KDO MÁ ADMIN PRÁVA

### Metoda 1: SQL Dotaz (doporučeno)

1. Otevřít: https://supabase.com/dashboard/project/bkyokcjpelqwtndienos/sql
2. Spustit tento dotaz:

```sql
-- Zobrazit všechny uživatele a jejich role
SELECT 
  p.user_id,
  p.email,
  p.role,
  p.full_name,
  p.created_at
FROM public.profiles p
ORDER BY p.created_at DESC;
```

**Hledáte:** `role = 'admin'`

---

### Metoda 2: Ověření vaší role

1. V browser console na https://kitloop.cz:

```javascript
const session = await supabase.auth.getSession();
const userId = session.data.session.user.id;
console.warn("Your user ID:", userId);

// Pak tento user_id použít v SQL dotazu:
```

2. V Supabase SQL Editor:

```sql
SELECT role 
FROM public.profiles 
WHERE user_id = 'VÁŠ_USER_ID_ZDE';
```

**Možné hodnoty:**
- `role = 'admin'` → ✅ Můžete používat admin_action
- `role = 'provider'` → ❌ Nemůžete (to jste nejspíš vy)
- `NULL` nebo jiné → ❌ Nemůžete

---

## 🛠️ JAK VYTVOŘIT ADMIN ÚČET

### Pokud žádný admin neexistuje:

**Možnost A: Manuální Update (rychlé)**

1. Supabase SQL Editor:

```sql
-- Zobrazit své user_id
SELECT user_id, email, role 
FROM public.profiles 
WHERE email = 'vase@email.com';

-- Upgradovat na admina
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'vase@email.com';

-- Ověřit změnu
SELECT email, role 
FROM public.profiles 
WHERE email = 'vase@email.com';
```

**Možnost B: Dedikovaný Script (robustnější)**

V terminálu:

```bash
cd /Users/mp/Downloads/kitloop-gear-hub-main

# Pokud existuje skript:
deno run --allow-net --allow-env scripts/create_admin.ts your@email.com

# Nebo použít Supabase SQL přímo
```

---

## ⚠️ DŮLEŽITÉ: SECURITY

**Admin role má plnou moc:**
- Schvalovat/zamítat providery
- Přístup ke všem datům (přes RLS exceptions)
- Měnit kritická nastavení

**Doporučení:**
- ✅ Vytvořit 1-2 admin účty max
- ✅ Použít silná hesla
- ✅ Zapnout 2FA (Supabase podporuje)
- ❌ NIKDY nesdílet admin credentials

---

## 📊 ROLE V SYSTÉMU

| Role | Přístup | Schvalování providerů |
|------|---------|----------------------|
| **admin** | Všechno | ✅ Ano |
| **provider** | Svůj inventory + rezervace | ❌ Ne |
| **renter** | Jen svoje rezervace | ❌ Ne |

---

## 🎯 TL;DR PRO VÁS

**Vaše situace:**
- ✅ Jste přihlášený (Provider Admin)
- ❌ Nejste Platform Admin
- ❌ Nemůžete testovat admin_action endpoint

**Co udělat:**
1. Spustit SQL: `SELECT role FROM profiles WHERE user_id = auth.uid();`
2. Pokud není 'admin' → změnit: `UPDATE profiles SET role = 'admin' WHERE user_id = auth.uid();`
3. Znovu login
4. Pak můžete testovat admin_action

---

## 🧪 JAK OVĚŘIT, ŽE ADMIN FUNGUJE

Po změně role na 'admin':

1. Logout + Login na https://kitloop.cz
2. V browser console:

```javascript
const result = await supabase.rpc('is_admin');
console.warn("Am I admin?", result.data);
// Očekáváno: true
```

3. Pokud `true` → můžete testovat admin_action endpoint ✅

---

**Vytvořeno:** 2026-01-10  
**Pro projekt:** Kitloop Gear Hub  
**Account check:** https://supabase.com/dashboard/project/bkyokcjpelqwtndienos/auth/users
