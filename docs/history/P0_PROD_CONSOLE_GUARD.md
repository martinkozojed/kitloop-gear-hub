# P0 Security: Production Console Guard

**Date:** 2026-01-10  
**Security Level:** P0 (PII Leakage Prevention)  
**Status:** ✅ ACTIVE

---

## Problem Statement

Third-party libraries (specifically `@supabase/supabase-js` GoTrueClient) contain logger assignments like:

```javascript
this.logger = console.log;
```

This assignment appears in production builds even with:
- ✅ Application code migrated to custom `logger` (no direct console.log)
- ✅ Supabase config set to `auth.debug: false`
- ✅ Vite terser config with `drop_console: ['log', 'info', 'debug']`

**Why terser can't remove it:** Terser drops console *calls* (`console.log("foo")`), not *assignments* (`this.logger = console.log`).

**Security Risk:** If library code later calls `this.logger()`, it could leak:
- Session tokens (during auth refresh)
- User metadata
- Auth flow events (email, user_id)

---

## Solution: Runtime Console Kill Switch

Instead of patching vendor libraries, we **override console methods** in production runtime:

```typescript
// src/main.tsx (before any imports)
if (import.meta.env.PROD) {
  console.log = () => {};   // Disabled
  console.info = () => {};  // Disabled
  console.debug = () => {}; // Disabled
  // console.warn and console.error remain functional ✅
}
```

### What This Does

1. **Production Only:** Kill switch activates only when `VITE_*` env is built for production
2. **Replaces Functions:** Assigns no-op functions to console.log/info/debug
3. **Preserves Errors:** `console.warn` and `console.error` remain functional for incident debugging
4. **Runtime Enforcement:** Even if library has `this.logger = console.log`, calling `this.logger()` does nothing

### What This Does NOT Do

- ❌ Modify vendor libraries (no forking required)
- ❌ Remove console statements from bundle (grep will still find text)
- ❌ Affect development builds (full console available in dev)

---

## Verification Procedure

### 1. Build Verification (Static Analysis)

```bash
# Build production bundle
npm run build

# Verify kill switch is in build
grep -o "console\.log=()=>{}" dist/assets/*.js
# Expected output: "console.log=()=>{}" (found)

# Check console usage (text will exist, but runtime disabled)
grep -o "console\.\w\+" dist/assets/*.js | sort | uniq -c
# Expected:
#   53 console.error  ✅ (functional)
#   27 console.warn   ✅ (functional)
#    1 console.log    ⚠️ (text exists, runtime disabled)
```

**Known Limitation:** `grep` will find `console.log` text because:
1. Kill switch assignment: `console.log=()=>{}`
2. Supabase assignment: `this.logger=console.log`

This is **expected and safe**. The runtime override ensures no actual logging occurs.

---

### 2. Runtime Verification (Production Build Preview)

```bash
# Option A: Vite Preview
npm run build
npm run preview
# Open http://localhost:4173

# Option B: Staging Deploy
# Deploy to staging environment
# Open staging URL
```

**DevTools Console Test:**

1. Open browser DevTools (F12 → Console tab)
2. **Before Login:**
   ```javascript
   // Type in console:
   console.log("Test - should be silent");
   console.warn("Test - should appear");
   console.error("Test - should appear");
   ```
   **Expected:**
   - ❌ "Test - should be silent" → NO OUTPUT
   - ✅ "Test - should appear" → VISIBLE (warn)
   - ✅ "Test - should appear" → VISIBLE (error)

3. **Critical User Flows:**
   Test that NO console.log/info/debug appears during:
   
   - ✅ **Login Flow:**
     - Navigate to `/login`
     - Enter credentials
     - Submit login
     - Check console: NO Supabase auth logs
   
   - ✅ **Logout Flow:**
     - Click logout
     - Check console: NO session cleanup logs
   
   - ✅ **Create Reservation:**
     - Navigate to reservation form
     - Fill details, submit
     - Check console: NO data logs
   
   - ✅ **Inventory Operations:**
     - Navigate to provider inventory
     - Add/edit item
     - Import CSV (if available)
     - QR code scan (if available)
     - Check console: NO ZXing/PapaParse logs
   
   - ✅ **Admin Actions:**
     - Login as admin
     - Approve/reject provider
     - Check console: NO audit log details

4. **Confirm Only Errors/Warnings:**
   - Only `console.warn` and `console.error` should appear
   - Typical prod warnings: React hydration, network errors, etc.
   - NO `console.log` or `console.info` output

---

### 3. Automated Verification (Future: Playwright)

**Not implemented yet** (project doesn't have Playwright).

When adding Playwright, create test:

```typescript
// tests/security/console-guard.spec.ts
test('Production console.log is disabled', async ({ page }) => {
  const logs: string[] = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'log' || msg.type() === 'info' || msg.type() === 'debug') {
      logs.push(msg.text());
    }
  });
  
  await page.goto('/');
  await page.click('text=Login');
  // ... perform critical actions
  
  expect(logs).toHaveLength(0); // No log/info/debug should appear
});
```

---

## Risk Assessment

| Risk | Before Kill Switch | After Kill Switch | Residual Risk |
|------|-------------------|-------------------|---------------|
| **PII in console.log** | 🔴 HIGH (library may log) | 🟢 NONE | Runtime disabled |
| **Session tokens logged** | 🔴 HIGH (Supabase auth) | 🟢 NONE | Runtime disabled |
| **User metadata leaked** | 🟡 MEDIUM (library debug) | 🟢 NONE | Runtime disabled |
| **Incident debugging** | 🟢 GOOD (all methods) | 🟢 GOOD (warn/error preserved) | None |

**Post-Mitigation:** PII leakage risk reduced to **practically zero**.

---

## Developer Notes

### When to Update This

1. **Adding New Third-Party Libraries:**
   - Check if library has debug/verbose modes
   - Verify console usage in library source
   - Test with kill switch (see Verification Procedure)

2. **Debugging Production Issues:**
   - `console.warn` and `console.error` remain functional
   - Use Sentry for error tracking (already configured)
   - Temporarily add `logger.error()` for specific debugging

3. **If Kill Switch Causes Issues:**
   - Check if library expects console.log for critical functionality
   - Provide custom logger override in library config:
     ```typescript
     // Example: Library with logger option
     initLibrary({
       logger: import.meta.env.PROD ? () => {} : console.log
     });
     ```

### Development Environment

Kill switch is **disabled in dev** (`import.meta.env.DEV`):
- Full console.log/info/debug available
- No impact on DX (developer experience)
- Custom `logger` utility still recommended (PII scrubbing)

---

## Compliance & Audit Trail

### P0 Security Fixes Timeline

| Date | Action | File |
|------|--------|------|
| 2026-01-10 | Migrated app code to `logger` utility | `src/**/*.tsx` |
| 2026-01-10 | Added Supabase `auth.debug: false` | `src/lib/supabase.ts` |
| 2026-01-10 | Implemented console kill switch | `src/main.tsx` |
| 2026-01-10 | Created verification procedure | `docs/P0_PROD_CONSOLE_GUARD.md` |

### Verification Evidence

**Build Artifact:**
```bash
dist/assets/index-UagxUdeY.js
  - console.log=()=>{}  ✅ (kill switch present)
  - console.error calls ✅ (preserved)
  - console.warn calls  ✅ (preserved)
```

**Runtime Test:** (performed on staging)
- ✅ Login/logout: No console.log output
- ✅ Reservation flow: No console.log output
- ✅ Admin actions: No console.log output
- ✅ Error handling: console.error still functional

---

## Quick Reference

### Commands

```bash
# Build production
npm run build

# Verify kill switch in build
grep "console\.log=()=>{}" dist/assets/*.js

# Preview production build
npm run preview  # http://localhost:4173

# Check console usage
grep -o "console\.\w\+" dist/assets/*.js | sort | uniq -c
```

### Files Changed

```
src/main.tsx                         [Modified - kill switch added]
docs/P0_PROD_CONSOLE_GUARD.md       [Created - this document]
```

### Related Documents

- [`P0_SECURITY_AUDIT_FINAL.md`](../P0_SECURITY_AUDIT_FINAL.md) - Full security audit
- [`P0_SECURITY_SMOKE_TEST.md`](../P0_SECURITY_SMOKE_TEST.md) - Staging test checklist
- [`src/lib/logger.ts`](../src/lib/logger.ts) - Custom logger implementation

---

## Rollback Plan

If kill switch causes critical issues in production:

1. **Quick Rollback:**
   ```typescript
   // src/main.tsx - Comment out kill switch
   /*
   if (import.meta.env.PROD) {
     console.log = () => {};
     // ...
   }
   */
   ```

2. **Rebuild & Deploy:**
   ```bash
   npm run build
   # Deploy dist/
   ```

3. **Alternative Mitigation:**
   - Use Supabase custom logger override
   - Add Content Security Policy to block console logging tools
   - Monitor Sentry for PII exposure patterns

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-10  
**Owner:** Security Team / Full-Stack Engineering
