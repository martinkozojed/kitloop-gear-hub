# 🚀 VYTVOŘIT ADMINA Z provider@test.cz

## ⚡ QUICK GUIDE (2 minuty)

### KROK 1: Otevřít SQL Editor

**Otevřít tento link:**
https://supabase.com/dashboard/project/bkyokcjpelqwtndienos/sql/new

(Měli byste být automaticky přihlášeni)

---

### KROK 2: Spustit tento SQL

**Zkopírovat a vložit:**

```sql
-- Step 1: Zkontrolovat aktuální status (email je v auth.users, ne profiles)
SELECT 
  au.email,
  p.role as current_role,
  p.full_name
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE au.email = 'provider@test.cz';
```

**Spustit** (tlačítko RUN nebo Ctrl+Enter)

**Očekávaný výsledek:**
```
email             | current_role | full_name
provider@test.cz  | provider     | ...
```

---

### KROK 3: Upgradovat na admina

**Zkopírovat a spustit:**

```sql
-- Upgrade to admin (musíme najít user_id z auth.users)
UPDATE public.profiles 
SET role = 'admin'
WHERE user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'provider@test.cz'
);
```

**Očekávaný výsledek:**
```
UPDATE 1
```

---

### KROK 4: Ověřit změnu

**Zkopírovat a spustit:**

```sql
-- Verify
SELECT 
  au.email,
  p.role,
  p.full_name
FROM auth.users au
JOIN public.profiles p ON p.user_id = au.id
WHERE au.email = 'provider@test.cz';
```

**Očekávaný výsledek:**
```
email             | role  | full_name
provider@test.cz  | admin | ...  ✅
```

---

### KROK 5: Znovu se přihlásit

1. Otevřít: https://kitloop.cz
2. Logout (pokud jste přihlášeni)
3. Login s:
   - Email: `provider@test.cz`
   - Password: `test1234`

---

### KROK 6: Ověřit admin přístup

**V browser console (F12):**

```javascript
const result = await supabase.rpc('is_admin');
console.warn("Am I admin?", result.data);
```

**Očekáváno:** `true` ✅

---

## 🎯 HOTOVO!

Teď můžete testovat admin_action endpoint podle guide:
- `ADMIN_QUICK_TEST.md`

---

## 🚨 Pokud něco selže

### Problém: "No rows returned" v kroku 1
**Řešení:** Účet `provider@test.cz` neexistuje v DB

```sql
-- Vytvořit nový profil (pokud chybí)
-- POZOR: Nejdřív musí existovat auth user!
-- Ověřit v: https://supabase.com/dashboard/project/bkyokcjpelqwtndienos/auth/users
```

### Problém: "UPDATE 0" v kroku 3
**Řešení:** Email je špatně nebo profil neexistuje

```sql
-- Zkontrolovat všechny účty
SELECT email, role FROM public.profiles;
```

### Problém: "is_admin returns false" v kroku 6
**Řešení:** Logout + Login znovu (JWT token je starý)

---

**Vytvořeno:** 2026-01-10  
**Účel:** Upgrade provider@test.cz na platform admina  
**Pro:** Admin action smoke tests
