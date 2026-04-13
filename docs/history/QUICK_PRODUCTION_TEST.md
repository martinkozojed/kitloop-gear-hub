# ⚡ QUICK PRODUCTION TEST (2 minuty)

## Test Kill Switch (KRITICKÉ)

### Postup:
1. Otevřít: **https://kitloop.cz**
2. Stisknout: **F12** (DevTools)
3. Přejít na: **Console** tab
4. Spustit tyto příkazy:

```javascript
// Test 1: Přímé volání (musí být TICHO)
console.log("❌ TOTO BY NEMĚLO BÝT VIDĚT");
console.info("❌ TOTO BY NEMĚLO BÝT VIDĚT");
console.debug("❌ TOTO BY NEMĚLO BÝT VIDĚT");

// Test 2: Warn/Error (musí být VIDITELNÉ)
console.warn("✅ Toto MUSÍ být viditelné");
console.error("✅ Toto MUSÍ být viditelné");

// Test 3: Ověření kill switchu
console.log.toString();
// Očekávaný output: "() => {}" nebo podobné
```

### ✅ PASS Kritéria:
- ❌ Žádný output z console.log/info/debug
- ✅ Warn/error jsou viditelné (žlutě/červeně)
- ✅ `console.log.toString()` vrací prázdnou funkci

### ❌ FAIL = P0 BLOCKER:
Pokud vidíte OUTPUT z console.log → **OKAMŽITÝ ROLLBACK**

---

## Test Login Flow (DŮLEŽITÉ)

### Postup:
1. Na https://kitloop.cz klikněte: **Login**
2. Zadejte credentials a přihlašte se
3. **BĚHEM přihlášení** sledujte Console
4. Po přihlášení projděte: Dashboard → Create Reservation

### ✅ PASS:
- Žádné console.log výpisy během auth flow
- Žádné console.log v dashboard/reservation

### ❌ FAIL = P0:
Pokud vidíte citlivá data (email, token, UUID) → **ROLLBACK**

---

## Test Admin Action (VOLITELNÉ, 5 minut)

**Pouze pokud máte admin účet:**

### Postup:
1. Přihlásit se jako admin
2. V Console spustit:
```javascript
const session = await supabase.auth.getSession();
const token = session.data.session.access_token;
console.warn("Token pro test:", token); // Warn JE povoleno
```

3. V terminálu (lokálně) spustit:
```bash
# Test 401 (no auth)
curl -X POST https://bkyokcjpelqwtndienos.supabase.co/functions/v1/admin_action \
  -H "Content-Type: application/json" \
  -d '{"action":"approve_provider","target_id":"test"}'

# Očekáváno: {"code":401,...}
```

4. Pokud máte pending providera, test approve:
```bash
curl -X POST https://bkyokcjpelqwtndienos.supabase.co/functions/v1/admin_action \
  -H "Authorization: Bearer VÁŠTOKENZDÉ" \
  -H "Content-Type: application/json" \
  -d '{
    "action":"approve_provider",
    "target_id":"UUID_PENDING_PROVIDERA",
    "reason":"Production smoke test"
  }'

# Očekáváno: {"success":true,"audit_log_id":"..."}
```

### ✅ PASS:
- 401 bez tokenu
- 200 s admin tokenem
- Provider změnil status
- Audit log vytvořen

---

## 🚨 JAK VYHODNOTIT

### Scenario A: Vše PASS
✅ **Production je OK** → Žádná akce nutná  
✅ Riziko PII leakage: **NULOVÉ**  
✅ Security rating: **🟢 SECURE**

### Scenario B: Kill switch FAIL
🔴 **OKAMŽITÝ ROLLBACK**

```bash
cd /Users/mp/Downloads/kitloop-gear-hub-main
git revert HEAD~4..HEAD
npm run build
netlify deploy --prod  # nebo drag & drop dist/
```

### Scenario C: Admin actions FAIL
🟡 **Není kritické pro PII**, ale:
- Zkontrolovat DB migrace
- Otestovat edge function lokálně
- Fix + redeploy jen edge function

---

## ⏱️ Čas potřebný:
- **Kill switch test:** 2 minuty (KRITICKÉ)
- **Login flow test:** 3 minuty (DŮLEŽITÉ)
- **Admin test:** 5 minut (VOLITELNÉ)

**CELKEM:** 5-10 minut pro kompletní jistotu

---

## 📊 Aktuální stav:

**Bez těchto testů:**
- Confidence: 85%
- Risk: MEDIUM (kill switch neověřen v runtime)

**Po těchto testech (PASS):**
- Confidence: 99%
- Risk: LOW (všechno ověřeno)

---

**💡 TIP:** Začněte s kill switch testem (2 min). Pokud FAIL → okamžitý rollback. Pokud PASS → můžete klidně spát. 😴
