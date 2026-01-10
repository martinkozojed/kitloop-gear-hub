# P0 Security - Release Gate

**RC1** | 2026-01-10 | ✅ READY FOR STAGING

## Automated Verification

```bash
./verify_console_guard.sh  # Exit 0 = PASS, 1 = FAIL
```

**Checks:** Build, kill switch (src+dist), no leaks in src/, console counts

---

## Manual Staging Verification

### 1. Console Test (DevTools F12)
```javascript
console.log("TEST");    // ❌ SILENT
console.warn("TEST");   // ✅ APPEARS
console.error("TEST");  // ✅ APPEARS
```

### 2. Critical Flows (Zero console.log/info/debug)
- Login/logout → No Supabase logs
- Reservation → No data logs
- Inventory (CSV/QR) → No library logs
- Admin actions → No audit details

### 3. Error Test
Trigger network error → console.error + Sentry ✅

---

## PASS/FAIL Matrix

| Check | PASS | FAIL | Action |
|-------|------|------|--------|
| Script exit 0 | ✅ | ❌ | Fix & rerun |
| console.log silent | ✅ | ❌ | Check build |
| console.error works | ✅ | ❌ | Check override |
| No PII | ✅ | ❌ | BLOCK |

---

## Rollback

```bash
git revert HEAD && npm run build  # Deploy
```
