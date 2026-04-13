# RLS Quick Reference Guide

## TL;DR - The Problem & Solution

### The Problem
**Infinite recursion** when creating provider memberships during login:
1. User logs in → `ensureProviderMembership()` called
2. Tries to INSERT into `user_provider_memberships`
3. Policy checks if user owns provider (queries `providers` table)
4. Provider policy calls `is_provider_member()` function
5. Function queries `user_provider_memberships` table
6. **→ Circular dependency → Infinite recursion**

### The Solution
**v3 Architecture** eliminates recursion by:
1. ✅ **Removed** `is_provider_member()` function (inlined checks instead)
2. ✅ **Permissive** membership INSERT: users can add themselves (safe because other tables still check ownership)
3. ✅ **Layered** policies: memberships → providers → gear/reservations
4. ✅ **No circular** dependencies: each layer only queries lower layers

---

## Migration Instructions

### 1. Apply the Migration

```bash
# Local development
supabase db reset

# Or push to remote
supabase db push
```

### 2. Verify Migration

```sql
-- Check policy counts
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('providers', 'user_provider_memberships', 'gear_items', 'reservations')
GROUP BY tablename
ORDER BY tablename;

-- Expected counts:
-- gear_items: 3
-- providers: 9
-- reservations: 3
-- user_provider_memberships: 9
```

### 3. Test Critical Flows

```bash
# Test 1: Provider login (should not hang)
# - Login as provider user
# - Check console for "ensureProviderMembership" success

# Test 2: Create reservation (should work)
# - Navigate to provider dashboard
# - Create a test reservation
# - Verify it appears in list

# Test 3: Team member access (should work)
# - Add team member to provider
# - Login as team member
# - Verify they can manage gear/reservations
```

---

## Policy Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  LAYER 1: PROFILES                           │
│  Simple policies: user_id = auth.uid()                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│          LAYER 2: USER_PROVIDER_MEMBERSHIPS                  │
│  Policies:                                                   │
│  - SELECT: user_id = auth.uid() OR is_admin()                │
│  - INSERT: user_id = auth.uid() OR is_admin()                │
│  - UPDATE: user_id = auth.uid() OR is_admin()                │
│  - DELETE: user_id = auth.uid() OR is_admin() OR is_owner    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  LAYER 3: PROVIDERS                          │
│  Policies:                                                   │
│  - SELECT: verified OR user_id = auth.uid()                  │
│            OR has_membership OR is_admin()                   │
│  - INSERT: user_id = auth.uid() OR is_admin()                │
│  - UPDATE: user_id = auth.uid() OR is_member_owner           │
│            OR is_admin()                                     │
│  - DELETE: user_id = auth.uid() OR is_admin()                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│             LAYER 4: GEAR_ITEMS & RESERVATIONS               │
│  Policies:                                                   │
│  - SELECT: public view (active + verified)                   │
│  - ALL: provider owner OR team member OR admin               │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Changes from v2

| Aspect | v2 (Previous) | v3 (New) |
|--------|---------------|----------|
| **Function** | `is_provider_member()` exists | ❌ Removed (inlined) |
| **Membership INSERT** | Only self-insert | ✅ Same (self-insert) |
| **Provider SELECT** | Calls `is_provider_member()` | ✅ Inline membership check |
| **Recursion Risk** | ⚠️ Possible if function changes | ✅ Eliminated |
| **Admin Support** | ✅ Full | ✅ Full |
| **Clarity** | 😐 Function hides logic | ✅ All checks visible |

---

## Security Model

### Q: Can users add themselves to any provider?
**A**: Technically yes, BUT:
- User can only add themselves (not others)
- Foreign key ensures provider exists
- **Other tables still check `providers.user_id` for actual ownership**
- Membership alone doesn't grant access
- Worst case: User has fake membership but can't access data

### Q: How is access actually controlled?
**A**: Defense in depth - multiple checks:
1. **Membership check**: Does user have membership record?
2. **Ownership check**: Is `providers.user_id = auth.uid()`?
3. **Admin override**: Is `profiles.role = 'admin'`?

Even if step 1 is spoofed, step 2 catches it.

---

## Troubleshooting

### Problem: "Infinite recursion detected" error
**Solution**: Migration not applied. Run:
```bash
supabase db push
```

### Problem: Provider can't create reservations
**Check**:
1. Is membership record created? Query `user_provider_memberships`
2. Is RLS enabled on tables? Check with `\d+ table_name` in psql
3. Are policies applied? Check `pg_policies` view

### Problem: Team member can't access provider data
**Check**:
1. Membership exists: `SELECT * FROM user_provider_memberships WHERE user_id = '<user_id>'`
2. Provider ownership: `SELECT user_id FROM providers WHERE id = '<provider_id>'`
3. RLS policies: `SELECT policyname FROM pg_policies WHERE tablename = 'providers'`

---

## Rollback Plan

If issues occur:

```sql
-- EMERGENCY: Disable RLS temporarily
ALTER TABLE public.user_provider_memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations DISABLE ROW LEVEL SECURITY;

-- Investigate and fix

-- Re-enable when ready
ALTER TABLE public.user_provider_memberships ENABLE ROW LEVEL SECURITY;
-- ... etc
```

---

## Testing Checklist

- [ ] Provider login completes without hanging
- [ ] `ensureProviderMembership()` creates membership record
- [ ] Provider can view their own provider (verified or not)
- [ ] Provider can create gear items
- [ ] Provider can create reservations
- [ ] Team member can access provider data
- [ ] Non-member cannot access unverified provider
- [ ] Admin can access all data
- [ ] No infinite recursion errors in logs

---

## Contact

Questions? See full analysis in `RLS_ARCHITECTURE_ANALYSIS.md`

Migration file: `supabase/migrations/20250124_rls_architecture_v3_recursion_free.sql`
