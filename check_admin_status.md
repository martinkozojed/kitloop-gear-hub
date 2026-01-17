# 🔍 JAK ZJISTIT, JDO JE ADMIN

## ❌ "Provider Admin" ≠ Platform Admin

**Co vidíte:** "Logged in as Provider Admin"  
**Co to znamená:** Jste správce providera (vaší půjčovny)  
**Co NEMŮŽETE:** Schvalovat jiné providery (admin_action endpoint)

---

## 🔎 JAK ZKONTROLOVAT, KDO MÁ ADMIN PRÁVA

### Metoda 1: SQL Dotaz (trusted allowlist)

Admin práva se řídí tabulkou `public.user_roles` (role = 'admin'), nikoli editovatelným sloupcem `profiles.role`.

```sql
SELECT 
  ur.user_id,
  u.email,
  ur.role,
  ur.granted_at
FROM public.user_roles ur
LEFT JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY ur.granted_at DESC;
```

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
FROM public.user_roles 
WHERE user_id = 'VÁŠ_USER_ID_ZDE';
```

**Možné hodnoty:**
- `role = 'admin'` → ✅ Platform admin (admin_action povoleno)
- jiná hodnota / žádný záznam → ❌ Nejste admin

---

## 🛠️ JAK VYTVOŘIT ADMIN ÚČET

Admina přidáváme pouze do `public.user_roles`. Úpravy `profiles.role`/`is_admin` jsou blokované RLS.

1. Najděte user_id:  
```sql
SELECT id, email FROM auth.users WHERE email = 'vase@email.com';
```
2. Přidejte do allowlistu:  
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_ID>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```
3. Ověřte:  
```sql
SELECT role FROM public.user_roles WHERE user_id = '<USER_ID>';
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
- ❌ Nejste Platform Admin, dokud nejste v `user_roles` s rolí `admin`
- ❌ Nemůžete testovat admin_action endpoint

**Co udělat:**
1. Spustit SQL: `SELECT role FROM public.user_roles WHERE user_id = auth.uid();`
2. Pokud není 'admin' → požádat existujícího admina, aby vás přidal do allowlistu (viz výše).
3. Znovu login.
4. Pak můžete testovat admin_action.

---

## 🧪 JAK OVĚŘIT, ŽE ADMIN FUNGUJE

Po změně role na 'admin':

1. Logout + Login na https://kitloop.cz
2. V browser console:

```javascript
const result = await supabase.rpc('is_admin_trusted');
console.warn("Am I admin?", result.data);
// Očekáváno: true
```

3. Pokud `true` → můžete testovat admin_action endpoint ✅

---

**Vytvořeno:** 2026-01-10  
**Pro projekt:** Kitloop Gear Hub  
**Account check:** https://supabase.com/dashboard/project/bkyokcjpelqwtndienos/auth/users
