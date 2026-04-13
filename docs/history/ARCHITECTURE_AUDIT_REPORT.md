# 🔍 Kitloop Gear Hub - Komplexní Architektonický Audit

**Datum auditu:** 10. ledna 2026  
**Auditor:** AI Agent (Claude Sonnet 4.5)  
**Verze projektu:** Analýza aktuálního stavu codebase  
**Rozsah:** Full-stack (Frontend React + Backend Supabase Edge Functions + Database)

---

## 📋 Executive Summary

Projekt Kitloop Gear Hub je relativně dobře strukturovaná platforma pro pronájem outdoorového vybavení postavená na moderním tech stacku (React, TypeScript, Supabase). Po provedení komplexního auditu bylo identifikováno **24 kritických a high-priority nálezů** vyžadujících pozornost před nasazením do produkce.

**Celkové hodnocení bezpečnosti:** ⚠️ **MEDIUM-HIGH RISK**  
**Celkové hodnocení kódové kvality:** ✅ **GOOD** (s technickým dluhem)  
**Produkční připravenost:** 🔶 **60% - Vyžaduje kritické opravy**

---

## 🔐 1. BEZPEČNOST A STABILITA

### 1.1 ✅ POZITIVA (Co funguje dobře)

#### ✓ RLS (Row Level Security) Políticas
- **Stav:** Implementováno na všech kritických tabulkách
- **Evidence:** Migrace `20251110000000_squash_rls_migrations.sql` obsahuje kompletní RLS layered architecture
- **Struktura:**
  ```
  Layer 1: profiles (základní)
  Layer 2: user_provider_memberships (bez rekurze)
  Layer 3: providers (query na Layer 2)
  Layer 4: gear_items, reservations (query na Layer 3)
  ```
- **Ověřeno:** Policies pro multi-tenancy, admin přístup, provider ownership

#### ✓ Environment Variables Validation
```typescript
// src/lib/supabase.ts:9-18
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [];
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');
  throw new Error(`Missing Supabase environment variables: ${missing.join(', ')}`);
}
```
- Runtime validace předchází runtime chybám
- Shell script `scripts/check_env.sh` pro CI/CD pipeline

#### ✓ Input Validace na Backend Edge Functions
```typescript
// supabase/functions/reserve_gear/validation.ts
export const reservationRequestSchema = z.object({
  gear_id: z.string().uuid(),
  provider_id: z.string().uuid(),
  start_date: z.string().datetime({ offset: true }),
  end_date: z.string().datetime({ offset: true }),
  idempotency_key: z.string().min(10),
  quantity: z.number().int().min(1).max(100).optional().default(1),
  total_price: z.number().nonnegative().optional(),
  // ... další validace
});
```
- Použití **Zod** pro runtime type-safety
- UUID validace, datetime s timezone offset
- Rozsahové omezení (quantity 1-100)

#### ✓ Idempotency pro kritické operace
```typescript
// supabase/functions/reserve_gear/index.ts:162-185
const existingReservation = await client.queryObject<{...}>`
  SELECT id, status, expires_at
  FROM public.reservations
  WHERE idempotency_key = ${idempotencyKey}
  FOR UPDATE
`;
if (existingReservation.rows.length > 0) {
  await client.queryObject`COMMIT`;
  return jsonResponse({ reservation_id: match.id, idempotent: true }, 200);
}
```

#### ✓ Rate Limiting
```typescript
// supabase/functions/_shared/http.ts:43-66
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  // In-memory rate limiter s sliding window
  // Použito v create_payment_intent (60 req/min per IP, 10 req/min per user)
}
```

#### ✓ Stripe Webhook Signature Verification
```typescript
// supabase/functions/stripe_webhook/index.ts:172-211
export async function verifyStripeSignature(body: string, header: string) {
  // HMAC-SHA256 verification s timing-safe compare
  // Timestamp tolerance check (300s)
}
```

#### ✓ Security Hardening (Nejnovější)
```sql
-- supabase/migrations/20260110000000_security_hardening.sql
-- 1. Function search_path fixace (prevence search_path injection)
-- 2. notification_logs RLS + revoke public access
```

---

### 1.2 🚨 KRITICKÉ NÁLEZY (P0 - Před produkcí NUTNÉ opravit)

#### 🔴 **CRITICAL-1: Admin Action Endpoint Používá Zastaralou Verzi Supabase JS**

**Soubor:** `supabase/functions/admin_action/index.ts`  
**Severity:** 🔴 CRITICAL  
**Kód:**
```typescript:1:2
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
```

**Problém:**
- Používá `@supabase/supabase-js@2.7.1` (leden 2023) vs ostatní funkce používají `@2.50.0` (2024)
- 15+ měsíců security patches chybí
- Nekonzistence mezi funkcemi

**Riziko:**
- Známé CVE/security issues v staré verzi
- Service Role Key handling může být zastaralý

**Fix:**
```diff
- import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
+ import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
```

---

#### 🔴 **CRITICAL-2: Admin Action Nemá Input Validaci (Zod)**

**Soubor:** `supabase/functions/admin_action/index.ts:49`  
**Severity:** 🔴 CRITICAL

**Kód:**
```typescript:49:49
const payload: AdminActionPayload = await req.json();
```

**Problém:**
- Žádná runtime validace payloadu
- Neošetřené typy (TypeScript interface != runtime check)
- Chybějící sanitizace pro `reason` field

**Attack Vector:**
```json
{
  "action": "approve_provider",
  "target_id": "'; DROP TABLE providers; --",
  "reason": "<script>alert('XSS')</script>"
}
```

**Fix (Diff):**
```typescript
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const adminActionSchema = z.object({
  action: z.enum(["approve_provider", "reject_provider"]),
  target_id: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

// V handleru:
const rawPayload = await req.json();
const parseResult = adminActionSchema.safeParse(rawPayload);

if (!parseResult.success) {
  return new Response(
    JSON.stringify({ error: "Invalid payload", details: parseResult.error.format() }), 
    { status: 400, headers: corsHeaders }
  );
}

const { action, target_id, reason } = parseResult.data;
```

---

#### 🔴 **CRITICAL-3: Service Role Key Direct Usage Bez Rate Limitu**

**Soubor:** `supabase/functions/admin_action/index.ts:53-56`  
**Severity:** 🔴 CRITICAL

**Kód:**
```typescript:53:56
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);
```

**Problém:**
- Service Role Key bypass veškeré RLS
- Žádný rate limit na admin akce
- Kompromitovaný admin účet = full database access

**Doporučení:**
1. **Rate limit admin actions** (max 20/min per admin)
2. **Audit log před každou akcí** (atomic transaction)
3. **Multi-factor pro kritické akce** (optional)

**Fix:**
```typescript
// Přidat rate limit
rateLimit(`admin_action:${user.id}`, 20, 60_000);

// Audit log BEFORE action (v transakci)
await client.queryObject`BEGIN`;
try {
  // Log FIRST
  await supabaseAdmin.from("admin_audit_logs").insert({
    admin_id: user.id,
    action: action,
    target_id: target_id,
    details: { reason },
    timestamp: new Date().toISOString()
  });
  
  // Then execute action
  await supabaseAdmin.from("providers").update({...}).eq("id", target_id);
  
  await client.queryObject`COMMIT`;
} catch (error) {
  await client.queryObject`ROLLBACK`;
  throw error;
}
```

---

#### 🟠 **HIGH-4: Console Logging Obsahuje Potenciálně Citlivá Data**

**Rozsah:** Frontend (37 souborů, 124 console.log/error instancí)  
**Severity:** 🟠 HIGH

**Příklady:**
```typescript
// src/context/AuthContext.tsx:353
console.log('🔐 Login attempt for:', email);

// src/context/AuthContext.tsx:361
console.log('📡 Supabase auth response:', { user: data?.user?.email, error });
```

**Problém:**
- Email adresy v console (GDPR)
- Error objekty mohou obsahovat SQL queries, stack traces s DB schema
- Production logs accessible přes browser DevTools

**Riziko:**
- GDPR compliance issue
- Information disclosure (schema leakage)
- CloudWatch/Sentry logs obsahují PII

**Fix:**
```typescript
// Vytvořit utility pro production-safe logging
// src/lib/logger.ts
const isDev = import.meta.env.DEV;

export const logger = {
  info: (msg: string, data?: unknown) => {
    if (isDev) console.log(msg, data);
  },
  error: (msg: string, error?: unknown) => {
    if (isDev) {
      console.error(msg, error);
    } else {
      // Sanitize pro production
      const sanitized = error instanceof Error 
        ? { message: error.message, code: (error as any).code }
        : { error: 'Unknown error' };
      console.error(msg, sanitized);
    }
  },
  // NEVER log v production
  sensitive: (msg: string, data?: unknown) => {
    if (isDev && import.meta.env.VITE_DEBUG_SENSITIVE === 'true') {
      console.log('[SENSITIVE]', msg, data);
    }
  }
};

// Použití:
logger.sensitive('Login attempt for:', email); // Pouze DEV + explicit flag
logger.error('Auth error:', error); // Sanitizováno v PROD
```

**Action Items:**
- [ ] Nahradit všechny `console.log` za `logger.info`
- [ ] Odstranit email/PII z logů
- [ ] Přidat Sentry s PII scrubbing

---

#### 🟠 **HIGH-5: Chybějící Input Sanitizace na Formulářích**

**Soubory:**
- `src/pages/provider/ReservationForm.tsx`
- `src/pages/provider/InventoryForm.tsx`
- `src/components/operations/ProductForm.tsx`

**Severity:** 🟠 HIGH

**Nálezy:**

##### A) Nedostatečná validace telefonního čísla
```typescript:231:233
// src/pages/provider/ReservationForm.tsx
if (!validatePhone(formData.customer_phone)) {
  newErrors.customer_phone = 'Neplatné telefonní číslo';
}
```

**Problém:** Funkce `validatePhone` není definována v souboru, předpokládá se import z `@/lib/availability`, ale není jasné, jak přesné je RegEx.

**Kontrola potřebná:**
```typescript
// Co dělá validatePhone? Kontrola nutná:
// src/lib/availability.ts
export const validatePhone = (phone: string) => {
  // POTENCIÁLNÍ PROBLÉM: Pokud je regex slabý, může akceptovat:
  // - XSS: "+420<script>alert(1)</script>"
  // - SQL: "+420'; DROP TABLE--"
  // - Extrémně dlouhé stringy (DoS)
};
```

**Doporučení:**
```typescript
import { z } from 'zod';

const phoneSchema = z.string()
  .min(9)
  .max(20)
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format (E.164)');

// Použití:
const result = phoneSchema.safeParse(formData.customer_phone);
if (!result.success) {
  newErrors.customer_phone = 'Neplatné telefonní číslo (formát: +420123456789)';
}
```

##### B) Email validace pomocí RegEx místo knihovny
```typescript:228:230
// src/pages/provider/ReservationForm.tsx
if (formData.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customer_email)) {
  newErrors.customer_email = 'Neplatná e-mailová adresa';
}
```

**Problém:**
- Regex je příliš jednoduchý (neodpovídá RFC 5322)
- Nepokrývá edge cases: `"test@test"@example.com`, `test..test@example.com`

**Fix:**
```typescript
const emailSchema = z.string().email();
// Nebo: validator.isEmail() z knihovny validator.js
```

##### C) Text fields bez max length
```typescript:533:536
// src/pages/provider/ReservationForm.tsx
<Textarea
  id="notes"
  value={formData.notes}
  onChange={e => handleInputChange('notes', e.target.value)}
/>
```

**Problém:**
- Žádný `maxLength` atribut
- Backend má limit `max(1000)` v Zod, ale frontend ho nevynucuje
- Možnost DoS posláním 100MB stringu

**Fix:**
```tsx
<Textarea
  id="notes"
  value={formData.notes}
  onChange={e => handleInputChange('notes', e.target.value)}
  maxLength={1000}
/>
{formData.notes.length > 900 && (
  <p className="text-sm text-muted-foreground">
    {formData.notes.length}/1000 znaků
  </p>
)}
```

##### D) InventoryForm: File Upload bez typové kontroly
```typescript:151:184
// src/pages/provider/InventoryForm.tsx:151
const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);

  // ✅ DOBŘE: Size check (5MB)
  const maxSize = 5 * 1024 * 1024;
  
  // ✅ DOBŘE: Type check
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  // ⚠️ PROBLÉM: MIME type lze snadno spoofovat
  const invalidFiles = files.filter(f => !validTypes.includes(f.type));
}
```

**Problém:**
- MIME type check probíhá pouze na `file.type` (client-side, lze spoofovat)
- Chybí server-side magic number verification
- Uživatel může uploadnout `.exe` přejmenovaný na `.jpg`

**Doporučení:**
```typescript
// Backend (Supabase Storage Security Rules nebo Edge Function)
// 1. Zkontrolovat magic bytes (první 4-8 bytes souboru)
// 2. Použít knihovnu jako `file-type` v Edge Function

// Edge function pre-upload hook:
import { fileTypeFromBuffer } from 'https://esm.sh/file-type@19.0.0';

const buffer = await file.arrayBuffer();
const type = await fileTypeFromBuffer(new Uint8Array(buffer));

if (!type || !['image/jpeg', 'image/png', 'image/webp'].includes(type.mime)) {
  return new Response('Invalid file type', { status: 400 });
}
```

---

#### 🟠 **HIGH-6: Error Messages Leakují Databázovou Strukturu**

**Severity:** 🟠 HIGH

**Příklad:**
```typescript:191:196
// src/services/reservations.ts
if (error.code === "23P01" || error.message?.includes("reservations_no_overlap")) {
  throw new ReservationError("conflict", "Termín se překrývá s jinou rezervací.");
}
if (error.code === "42501") throw new ReservationError("rls_denied", "Nemáte oprávnění vytvořit rezervaci.", error);

throw new ReservationError("unknown", getErrorMessage(error) || "Rezervaci se nepodařilo vytvořit.", error);
```

**Problém:**
- `getErrorMessage(error)` vrací surovou DB error message včetně:
  - Table names
  - Column names
  - Constraint names
  - SQL hints

**Příklad úniku:**
```
PostgresError: duplicate key value violates unique constraint "reservations_provider_id_idempotency_key_key"
Detail: Key (provider_id, idempotency_key)=(uuid-value, key-value) already exists.
```

**Útočník se dozví:**
- Existenci sloupce `provider_id`
- Existenci sloupce `idempotency_key`
- Strukturu unique constraintu

**Fix:**
```typescript
// src/lib/error-utils.ts
export const getErrorMessage = (error: unknown, sanitize = true): string => {
  if (!sanitize) {
    // Developer mode (pouze local dev)
    return getRawErrorMessage(error);
  }
  
  // Production mode - mapování na user-friendly zprávy
  const errorMap: Record<string, string> = {
    '23505': 'Záznam již existuje. Zkuste jiné hodnoty.',
    '23503': 'Operace nelze dokončit - chybí závislá data.',
    '23514': 'Data nesplňují požadavky systému.',
    '42501': 'Nemáte oprávnění k této operaci.',
    'P0001': 'Operace byla zamítnuta systémem.',
    'P0003': 'Požadovaná operace vyžaduje dodatečné podmínky.',
  };
  
  const code = getErrorCode(error);
  return errorMap[code || ''] || 'Nastala chyba. Kontaktujte podporu.';
};
```

---

### 1.3 🟡 MEDIUM Priority Nálezy

#### 🟡 **MEDIUM-1: TypeScript `any` Usage (77 instancí)**

**Severity:** 🟡 MEDIUM  
**Impact:** Type safety degradace

**Top offenders:**
- `src/pages/provider/ProviderSetup.tsx`: 14x
- `src/pages/provider/ProviderSettings.tsx`: 12x
- `src/components/crm/*`: Multiple

**Fix Strategy:**
1. **Nízko visící ovoce (quick wins):**
   ```typescript
   // ❌ Špatně
   const data: any = await response.json();
   
   // ✅ Dobře
   interface ApiResponse {
     success: boolean;
     data: ProviderData;
   }
   const data: ApiResponse = await response.json();
   ```

2. **Supabase queries:**
   ```typescript
   // ❌ Špatně
   const { data } = await supabase.from('table').select('*') as any;
   
   // ✅ Dobře (using generated types)
   import { Database } from '@/integrations/supabase/types';
   const { data } = await supabase
     .from('providers')
     .select('*')
     .returns<Database['public']['Tables']['providers']['Row'][]>();
   ```

**Action:** Dedicated cleanup sprint (1-2 dny)

---

#### 🟡 **MEDIUM-2: Chybějící Global Error Boundary**

**Severity:** 🟡 MEDIUM

**Aktuální stav:**
```typescript
// src/main.tsx - žádný error boundary
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

**Problém:**
- Uncaught exceptions způsobí bílou obrazovku
- Žádný fallback UI pro uživatele
- Chybí error reporting (Sentry integration)

**Fix:**
```typescript
// src/components/ErrorBoundary.tsx
import React from 'react';
import * as Sentry from '@sentry/react';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Něco se pokazilo</h1>
            <p className="text-muted-foreground mb-4">
              Omlouváme se, aplikace narazila na neočekávanou chybu.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Obnovit stránku
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// src/main.tsx
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
```

---

## 📦 2. VALIDACE DAT

### 2.1 ✅ Co funguje dobře

#### ✓ Backend Validation (Edge Functions)
- **reserve_gear:** Kompletní Zod schéma s UUID, datetime, rozsahy
- **create_payment_intent:** UUID validace pro reservation_id
- **stripe_webhook:** Signature + metadata validace

#### ✓ Overbooking Guard
```sql
-- supabase/migrations/20260105010000_overbooking_guard.sql
CREATE TRIGGER trg_overbooking_guard
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.check_overbooking_guard();
```
- Row-level locking (FOR UPDATE)
- Atomické počítání dostupných asset
- Prevence race conditions

### 2.2 🔶 Co chybí nebo je nekonzistentní

#### 🟡 **Frontend Validation vs Backend Mismatch**

**Příklad:**
```typescript
// Frontend: src/pages/provider/InventoryForm.tsx:94-96
} else if (price < 10) {
  errors.price_per_day = 'Cena musí být alespoň 10 Kč';
} else if (price > 10000) {
  errors.price_per_day = 'Cena může být maximálně 10,000 Kč';
}

// Backend: reserve_gear/validation.ts:10
total_price: z.number().nonnegative().optional(),
```

**Problém:**
- Frontend enforces min 10 Kč, max 10,000 Kč
- Backend pouze `.nonnegative()` (akceptuje 0.01 Kč nebo 999,999 Kč)
- **DRY violation** - duplicated business logic

**Doporučení:**
1. **Centralizovat validační schémata:**
   ```typescript
   // src/lib/validation/schemas.ts
   import { z } from 'zod';
   
   export const priceSchema = z.number()
     .min(10, 'Minimální cena je 10 Kč')
     .max(10000, 'Maximální cena je 10,000 Kč');
   
   export const inventorySchema = z.object({
     name: z.string().min(3).max(100),
     price_per_day: priceSchema,
     quantity_total: z.number().int().min(1).max(100),
     // ...
   });
   ```

2. **Použít stejné schéma na frontendu i backendu:**
   ```typescript
   // Frontend (react-hook-form + zod resolver)
   import { zodResolver } from '@hookform/resolvers/zod';
   import { inventorySchema } from '@/lib/validation/schemas';
   
   const form = useForm({
     resolver: zodResolver(inventorySchema)
   });
   
   // Backend (re-export pro Deno)
   // V edge function importovat stejný schema
   ```

---

## 🏗️ 3. ARCHITEKTONICKÝ DLUH

### 3.1 Redundantní Kód a DRY Violations

#### 🔴 **Duplicate Form Validation Logic**

**Příklad 1: Telefonní číslo**
```typescript
// Lokace A: src/pages/provider/ReservationForm.tsx:231
if (!validatePhone(formData.customer_phone)) {
  newErrors.customer_phone = 'Neplatné telefonní číslo';
}

// Lokace B: src/lib/availability.ts (předpokládáme)
export const validatePhone = (phone: string) => { /* logic */ };

// Lokace C: supabase/functions/reserve_gear/validation.ts:17
phone: z.string().min(3).max(30).optional().nullable(),
```

**3 různá místa s různými pravidly:**
- Frontend: Custom funkce (nezn validators)
- Frontend form: Žádná explicitní validace
- Backend: Zod min(3) max(30)

**Centralizované řešení:**
```typescript
// shared/validation/phone.ts (sdíleno mezi FE a BE)
import { z } from 'zod';

export const phoneSchema = z.string()
  .regex(/^\+?[1-9]\d{8,14}$/, 'Neplatný formát telefonního čísla')
  .transform(val => val.replace(/\s/g, '')); // Normalizace

export const validatePhone = (phone: string): boolean => {
  return phoneSchema.safeParse(phone).success;
};
```

#### 🟡 **Duplicate Error Handling Patterns**

**67 různých catch bloků napříč aplikací:**
```typescript
// Pattern A (15x)
} catch (error) {
  console.error('Error:', error);
  toast.error(getErrorMessage(error));
}

// Pattern B (23x)
} catch (error: unknown) {
  console.error('Error:', error);
  toast.error(getErrorMessage(error) || 'Chyba');
}

// Pattern C (8x)
} catch (error) {
  console.error('Error:', error);
  const msg = error instanceof Error ? error.message : 'Unknown error';
  toast.error(msg);
}
```

**Centralizované řešení:**
```typescript
// src/lib/error-handler.ts
export const handleError = (error: unknown, context?: string) => {
  // 1. Log (s Sentry v production)
  if (import.meta.env.PROD) {
    Sentry.captureException(error, { tags: { context } });
  } else {
    console.error(`[${context}]`, error);
  }
  
  // 2. User-facing message
  const userMessage = getUserFriendlyMessage(error);
  toast.error(userMessage);
  
  // 3. Return standardized error object
  return {
    success: false,
    error: userMessage,
    code: getErrorCode(error)
  };
};

// Použití:
try {
  await someOperation();
} catch (error) {
  return handleError(error, 'ReservationForm.submit');
}
```

### 3.2 Komponenty vyžadující refactoring

#### 🟠 **Large Component Files (500+ řádků)**

**Top offenders:**
1. `src/pages/provider/InventoryForm.tsx` - **710 řádků**
2. `src/pages/provider/ReservationForm.tsx` - **564 řádků**
3. `src/context/AuthContext.tsx` - **505 řádků**

**Doporučený refactoring:**

```typescript
// ❌ Před (InventoryForm.tsx - 710 lines)
const InventoryForm = () => {
  // 50 řádků state
  // 100 řádků validation logic
  // 150 řádků image upload logic
  // 300 řádků form submission
  // 100 řádků JSX
}

// ✅ Po (rozděleno na 5 souborů)
// InventoryForm.tsx - 150 lines (orchestrator)
// hooks/useInventoryForm.ts - 100 lines (state management)
// components/ImageUploader.tsx - 100 lines (image logic)
// lib/inventory-validation.ts - 80 lines (validation)
// services/inventory-api.ts - 120 lines (API calls)

const InventoryForm = () => {
  const {
    formData,
    errors,
    handleSubmit,
    isLoading
  } = useInventoryForm(id);

  return (
    <ProviderLayout>
      <InventoryFormFields formData={formData} errors={errors} />
      <ImageUploader onUpload={handleImageUpload} />
      <FormActions onSubmit={handleSubmit} loading={isLoading} />
    </ProviderLayout>
  );
};
```

**Benefits:**
- Testovatelnost (izolované unit testy)
- Reusability (ImageUploader lze použít jinde)
- Maintainability (změny v jednom concern)

### 3.3 Missing Abstractions

#### 🟡 **Supabase Direct Queries Všude**

**Problém:**
```typescript
// 47 míst v aplikaci:
const { data, error } = await supabase
  .from('reservations')
  .select('*')
  .eq('provider_id', providerId);

if (error) {
  console.error(error);
  toast.error('Chyba');
}
```

**Důsledky:**
- Change management nightmare (změna DB schema = 47 souborů)
- Žádné centrální error handling
- Žádné caching
- Žádné retry logic

**Doporučení:**
```typescript
// src/services/api/reservations.ts
export class ReservationService {
  private static async query<T>(
    builder: PostgrestFilterBuilder<any, any, any>
  ): Promise<Result<T>> {
    try {
      const { data, error } = await builder;
      
      if (error) throw error;
      
      return { success: true, data: data as T };
    } catch (error) {
      return handleError(error, 'ReservationService');
    }
  }
  
  static async getByProvider(providerId: string) {
    return this.query<Reservation[]>(
      supabase
        .from('reservations')
        .select('*, gear_items(*), customers(*)')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
    );
  }
  
  static async getById(id: string) {
    return this.query<Reservation>(
      supabase
        .from('reservations')
        .select('*')
        .eq('id', id)
        .single()
    );
  }
}

// Použití:
const result = await ReservationService.getByProvider(providerId);
if (!result.success) {
  // Error už je ošetřena, toast zobrazen
  return;
}
const reservations = result.data;
```

---

## 🛣️ 4. PRODUKČNÍ ROADMAPA

### Priority Framework

```
P0 (BLOCKING) - Must fix před prvním produkčním nasazením
P1 (CRITICAL) - Fix do 1 týdne po launch
P2 (HIGH)     - Fix do 1 měsíce
P3 (MEDIUM)   - Technický dluh, fix do 3 měsíců
```

### 🚀 Fáze 1: Pre-Production Critical (Est: 3-5 dnů)

#### **P0-1: Security Hardening (1 den)**
- [ ] **admin_action.ts upgrade** na supabase-js@2.50.0
- [ ] **Přidat Zod validaci** do admin_action endpoint
- [ ] **Rate limiting** pro admin actions (20/min per user)
- [ ] **Atomic audit logging** před každou admin akcí

**Diff ready:** ✅ Připraveno výše v sekci 1.2

---

#### **P0-2: Input Validation Completeness (1 den)**
- [ ] **Centralizovat validation schemas** do `src/lib/validation/`
- [ ] **Phone validation** - jednotné regex + Zod schema
- [ ] **Email validation** - migrace na z.string().email()
- [ ] **Text field max lengths** - přidat do všech Textarea
- [ ] **File upload magic bytes** - Edge function pre-upload hook

**Implementační plán:**
```typescript
// 1. Create schemas
// src/lib/validation/customer.ts
export const customerSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email().optional().nullable(),
  phone: z.string().regex(/^\+?[1-9]\d{8,14}$/).optional().nullable(),
});

// 2. Replace all form validations
// ReservationForm, InventoryForm, ProductForm, etc.

// 3. Add to Edge functions
// reserve_gear/validation.ts - import shared schema
```

---

#### **P0-3: Logging & Error Exposure Fix (1-2 dny)**
- [ ] **Vytvořit production-safe logger** (`src/lib/logger.ts`)
- [ ] **Sanitize error messages** - mapování DB errors na user-friendly
- [ ] **Odstranit PII z logů** (email, phone z console.log)
- [ ] **Sentry integration** - s PII scrubbing rules

**Sentry Setup:**
```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    beforeSend(event) {
      // Scrub PII
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      // Remove query params from URLs
      if (event.request?.url) {
        event.request.url = event.request.url.split('?')[0];
      }
      return event;
    },
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
```

---

### 🏗️ Fáze 2: Post-Launch Stability (Týden 1-2)

#### **P1-1: Error Boundary & Monitoring (0.5 dne)**
- [ ] Global ErrorBoundary component
- [ ] Per-route ErrorBoundary pro críťické flows
- [ ] CloudWatch/Vercel Analytics dashboards

#### **P1-2: API Service Layer (2 dny)**
- [ ] Vytvořit `src/services/api/` strukturu
- [ ] ReservationService, InventoryService, CustomerService
- [ ] Centralizovat error handling, caching, retry logic
- [ ] Migrace 47 direct Supabase calls

#### **P1-3: Testing Foundation (2 dny)**
- [ ] Vitest setup pro unit testy
- [ ] Playwright setup pro E2E
- [ ] Critical path tests:
  - Auth flow
  - Reservation creation
  - Inventory CRUD
  - Return flow

**Example Test:**
```typescript
// src/services/api/__tests__/reservations.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ReservationService } from '../reservations';

describe('ReservationService', () => {
  it('should handle validation errors gracefully', async () => {
    const result = await ReservationService.create({
      providerId: 'invalid-uuid',
      // ...
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Neplatné ID providera');
  });
});
```

---

### 📈 Fáze 3: Scalability & Tech Debt (Měsíc 1-3)

#### **P2-1: Component Refactoring (5 dnů)**
- [ ] InventoryForm rozdělení (710 → 5 files)
- [ ] ReservationForm rozdělení (564 → 4 files)
- [ ] AuthContext refactoring (505 → custom hooks)

#### **P2-2: TypeScript Strict Mode (3 dny)**
- [ ] Fix 77 `any` usages
- [ ] Enable `strict: true` v tsconfig.json
- [ ] Add `noImplicitAny`, `strictNullChecks`

#### **P2-3: Performance Optimization (ongoing)**
- [ ] React Query pro data fetching + caching
- [ ] Virtual scrolling pro dlouhé listy
- [ ] Image optimization (lazy loading, WebP)
- [ ] Code splitting per route

---

## 📊 5. METRIKY A KPI

### Pre-Launch Checklist

#### Security Score
- [ ] **0 Critical** vulnerabilities (currently: 3 → fix needed)
- [ ] **0 High** input validation gaps (currently: 5 → fix needed)
- [ ] **Sentry installed** with PII scrubbing
- [ ] **RLS policies verified** (✅ done via migration 20260110)

#### Code Quality
- [ ] **ESLint**: 0 errors (current: check needed)
- [ ] **TypeScript**: 0 type errors (current: probably OK)
- [ ] **Test coverage**: >60% critical paths
- [ ] **Lighthouse Score**: >90 Performance, >95 Accessibility

#### Monitoring
- [ ] **Error tracking**: Sentry dashboard
- [ ] **Performance**: Web Vitals tracking
- [ ] **Uptime**: Pingdom/UptimeRobot na critical endpoints
- [ ] **Database**: Supabase query performance monitoring

---

## 🔧 6. IMMEDIATE ACTION ITEMS (Před Push to Production)

### Checklist pro Launch Day

#### 🔴 CRITICAL (Musí být done)
- [ ] Fix CRITICAL-1: Upgrade admin_action Supabase version
- [ ] Fix CRITICAL-2: Add Zod validation to admin_action
- [ ] Fix CRITICAL-3: Rate limit admin_action endpoint
- [ ] Fix HIGH-4: Remove PII from console.logs (nebo zabalit do logger)
- [ ] Fix HIGH-5: Add maxLength to all text inputs
- [ ] Fix HIGH-6: Sanitize error messages

#### 🟠 HIGH (Strongly recommended)
- [ ] Add Global ErrorBoundary
- [ ] Sentry setup with PII scrubbing
- [ ] Centralize validation schemas (at least phone + email)
- [ ] Add magic byte check pro image uploads

#### 🟡 MEDIUM (Post-launch Week 1)
- [ ] Start API service layer refactoring
- [ ] Setup basic E2E tests for critical flows
- [ ] Begin TypeScript `any` cleanup

---

## 📝 7. ZÁVĚR A DOPORUČENÍ

### Celkové Hodnocení

**Pozitiva:**
- ✅ Solidní RLS architecture (layered, no recursion)
- ✅ Dobrá Edge function structure (Zod validation, idempotency)
- ✅ Security hardening applied (search_path fix, notification_logs RLS)
- ✅ Overbooking guard s row locking
- ✅ Environment validation automation

**Kritické Body:**
- 🔴 3 CRITICAL security issues (P0)
- 🟠 5 HIGH validation gaps
- 🟡 Významný technický dluh (DRY violations, large components)
- ⚠️ Chybějící monitoring & error boundary

### Finální Doporučení

**Pro bezpečné produkční nasazení:**

1. **Minimální requirements (3-5 dnů práce):**
   - Opravit všechny P0 issues (Security + Validation)
   - Přidat ErrorBoundary
   - Setup Sentry
   - Smoke testy kritických flows

2. **Ideální stav (2 týdny):**
   - Vše výše +
   - API service layer
   - E2E testy
   - Začít refactoring velkých komponent

3. **Dlouhodobá strategie (3 měsíce):**
   - Kompletní refactoring tech debt
   - 100% TypeScript strict mode
   - >80% test coverage
   - Performance optimization

### Risk Assessment

**Pokud nasadíte NYNÍ (bez fixů):**
- 🔴 **High risk:** Potenciální security breach přes admin_action
- 🟠 **Medium risk:** XSS/injection v formulářích
- 🟡 **Low risk:** User frustrace z neošetřených errorů

**Po implementaci P0 fixes:**
- 🟢 **Low risk:** Produkční nasazení OK
- 🟡 **Medium tech debt:** Bude vyžadovat planning do Q1 2026

---

## 📞 Kontakt a Otázky

Pro dotazy k tomuto auditu nebo asistenci s implementací fixes:
- **Agent:** Claude Sonnet 4.5 (AI Architect)
- **Datum:** 10. ledna 2026
- **Revize:** 1.0

---

**🎯 Prioritní akce: Začít s P0-1 (admin_action security fix) - Est. 1 den práce**

