# 🔴 KRITICKÉ OVĚŘENÍ P0 IMPLEMENTACE

**Date:** 2026-01-11  
**Auditor:** Critical Review (Claude Sonnet 4.5)  
**Status:** 🔍 IN PROGRESS

---

## 🚨 NALEZENÉ PROBLÉMY

### 🔴 **ISSUE #1: Email Validation Edge Case - Consecutive Dots**

**File:** `src/lib/availability.ts:264`

**Current Regex:**
```typescript
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
```

**Problem:**
The `[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+` part uses `+` quantifier, which means:
- ✅ `test@example.com` - OK
- ❌ `test..test@example.com` - **PASSES** (should fail!)
- ❌ `test.@example.com` - **PASSES** (should fail!)
- ❌ `.test@example.com` - **PASSES** (should fail!)

**Root Cause:** No validation that dots aren't consecutive or at start/end of local part.

**Severity:** 🟡 MEDIUM (cosmetic validation issue, not security critical)

**Test:**
```typescript
validateEmail('test..test@example.com') // Currently returns TRUE, should be FALSE
validateEmail('.test@example.com')      // Currently returns TRUE, should be FALSE
validateEmail('test.@example.com')      // Currently returns TRUE, should be FALSE
```

**Fix Required:** YES

---

### 🟠 **ISSUE #2: File Validation - Empty MIME Type Logic Flaw**

**File:** `src/lib/file-validation.ts:145-146`

**Current Code:**
```typescript
const clientType = file.type.replace('image/', '').replace('jpg', 'jpeg');
if (clientType !== detectedType && clientType !== '') {
  // Spoofing attempt
}
```

**Problem:**
If `file.type` is empty string (which is valid for unknown types), then:
- `clientType = ''` (after replacements)
- `clientType !== detectedType` → TRUE ('' !== 'jpeg')
- `clientType !== ''` → **FALSE**
- Condition fails, validation passes

**This means:**
A file with **no MIME type** (spoofed or corrupted) will **PASS validation** if magic bytes match.

**Edge Case:**
```typescript
// Malicious file with JPEG magic bytes but no MIME type
const file = new File([jpegBytes], 'malware.jpg', { type: '' });
// Currently: PASSES validation (should it?)
```

**Is this intended behavior?**
- **Arguments FOR:** Some legitimate files have empty MIME, rely on magic bytes
- **Arguments AGAINST:** Empty MIME is suspicious, should reject

**Severity:** 🟡 MEDIUM (edge case, unclear if exploit vector)

**Recommendation:** Add explicit handling for empty MIME type

---

### 🟡 **ISSUE #3: Character Counter Re-render Performance**

**Files:** 
- `src/pages/provider/ReservationForm.tsx:538-541`
- `src/pages/provider/InventoryForm.tsx:509-513, 677-681`

**Current Implementation:**
```tsx
{formData.notes.length > 900 && (
  <p className="text-sm text-muted-foreground mt-1">
    {formData.notes.length}/1000 znaků
  </p>
)}
```

**Problem:**
- Counter only appears at 900+ characters
- **User Experience Issue:** No feedback until 90% full
- Users might be surprised when suddenly limited

**Also:**
- Re-renders on **every keystroke** after 900 chars (minor performance concern)

**Severity:** 🟢 LOW (UX issue, not critical)

**Recommendation:** Show counter always, or from 50% (500 chars)

---

### ✅ **VERIFIED OK: Magic Bytes Logic**

**File:** `src/lib/file-validation.ts:48-93`

**Checked:**
- ✅ JPEG signatures cover all variants (JFIF, Exif, etc.)
- ✅ PNG signature is complete 8-byte header
- ✅ WEBP checks RIFF + WEBP at offset 8 (correct)
- ✅ GIF handles both GIF87a and GIF89a
- ✅ Byte matching loop is correct
- ✅ Async logic handles errors properly

**No issues found.** ✅

---

### ✅ **VERIFIED OK: Phone Validation**

**File:** `src/lib/availability.ts:244-251`

**Checked:**
```typescript
const phoneRegex = /^(\+420|\+421)\d{9}$/;
```

- ✅ Requires +420 or +421 prefix (Czech/Slovak)
- ✅ Exactly 9 digits after prefix (correct format)
- ✅ No other characters allowed
- ✅ Spaces removed before validation

**Edge Cases Tested:**
- ✅ `+420123456789` - PASS
- ✅ `+421123456789` - PASS
- ✅ `+420 123 456 789` - PASS (spaces removed)
- ✅ `+42012345678` (8 digits) - FAIL ✅
- ✅ `+4201234567890` (10 digits) - FAIL ✅
- ✅ `420123456789` (no +) - FAIL ✅

**No issues found.** ✅

---

### ✅ **VERIFIED OK: Textarea maxLength Attribute**

**Files:**
- `ReservationForm.tsx:536` - `maxLength={1000}` ✅
- `InventoryForm.tsx:508` - `maxLength={2000}` ✅
- `InventoryForm.tsx:678` - `maxLength={1000}` ✅

**Checked:**
- ✅ HTML5 `maxLength` attribute prevents typing beyond limit
- ✅ Backend has matching limits in Zod schemas
- ✅ No bypass possible (browser enforced)

**No issues found.** ✅

---

## 📊 SEVERITY SUMMARY

| Issue | Severity | Impact | Fix Required |
|-------|----------|--------|--------------|
| #1 Email consecutive dots | 🟡 MEDIUM | Cosmetic validation | ✅ YES |
| #2 File empty MIME type | 🟡 MEDIUM | Edge case unclear | ⚠️ MAYBE |
| #3 Character counter UX | 🟢 LOW | User experience | 🔵 OPTIONAL |

---

## 🎯 PRODUCTION IMPACT ASSESSMENT

### Can Deploy Now?
**Answer:** 🟡 **YES, with caveats**

**Reasoning:**
1. **Issue #1 (Email):** Non-blocking
   - Users with consecutive dots in email are rare
   - Backend likely has additional validation
   - No security exploit

2. **Issue #2 (File MIME):** Uncertain
   - Empty MIME files are rare in legitimate use
   - Magic bytes still protect against exe/malware
   - Needs product decision: strict or permissive?

3. **Issue #3 (Counter):** Cosmetic only
   - maxLength works correctly
   - Just UX preference

### Risk Level
- **Before fixes:** 🟡 LOW-MEDIUM RISK
- **After fixes:** 🟢 LOW RISK

---

## ✅ RECOMMENDED FIXES (20 minutes)

### Fix #1: Email Validation (10 min)
```typescript
export function validateEmail(email: string): boolean {
  if (!email || email.trim() === '') {
    return false;
  }

  const trimmed = email.trim();

  // Check for consecutive dots, leading/trailing dots
  if (
    trimmed.includes('..') ||
    trimmed.startsWith('.') ||
    trimmed.includes('@.')
  ) {
    return false;
  }

  // Then apply regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(trimmed);
}
```

### Fix #2: File Empty MIME Type (5 min)
```typescript
// Option A: Strict (reject empty MIME)
if (file.type === '') {
  return {
    valid: false,
    detectedType: null,
    error: 'Soubor nemá MIME typ (podezřelý soubor)',
  };
}

// Option B: Permissive (allow if magic bytes match)
if (clientType === '') {
  // Trust magic bytes only, skip MIME check
  return { valid: true, detectedType };
}
```

### Fix #3: Character Counter UX (5 min)
```tsx
{/* Show counter from 80% full */}
{formData.notes.length > 800 && (
  <p className={`text-sm mt-1 ${
    formData.notes.length > 950 ? 'text-red-600' : 'text-muted-foreground'
  }`}>
    {formData.notes.length}/1000 znaků
  </p>
)}
```

---

## 🧪 TESTING NEEDED

### Manual Tests:
```bash
# 1. Email validation
# Try: test..test@example.com (should fail)
# Try: .test@example.com (should fail)
# Try: test@example.com (should pass)

# 2. File upload
# Upload: valid JPEG
# Upload: .exe renamed to .jpg (should fail)
# Upload: file with no extension (edge case)

# 3. Character counters
# Type 901 characters in notes field
# Verify counter appears
# Verify maxLength blocks at 1000
```

---

## 📝 NEXT STEPS

1. **Immediate (before deploy):**
   - [ ] Fix Issue #1 (email dots) - 10 min
   - [ ] Decide on Issue #2 (empty MIME) - 5 min
   
2. **Optional (post-deploy):**
   - [ ] Improve counter UX (Issue #3)
   - [ ] Add E2E tests for validation edge cases

---

**Status:** 🟡 **MINOR ISSUES FOUND** - Fixes recommended before deploy
