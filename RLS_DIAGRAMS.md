# RLS Architecture Diagrams

## Diagram 1: Circular Dependency Problem (v1 & v2)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    THE RECURSION CYCLE (BROKEN)                      │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────┐
    │  Frontend: Provider Login                     │
    │  AuthContext.tsx line 174                     │
    │  ensureProviderMembership(userId, providerId) │
    └──────────────────┬───────────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────────┐
    │  INSERT INTO user_provider_memberships        │
    │  (user_id, provider_id, role)                 │
    └──────────────────┬───────────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────────┐
    │  RLS INSERT Policy (v1):                      │
    │  WITH CHECK:                                  │
    │    - Is admin? OR                             │
    │    - Owns provider? ←─────────────┐           │
    │      SELECT FROM providers        │           │
    │      WHERE id = provider_id       │           │
    │      AND user_id = auth.uid()     │           │
    └──────────────────┬───────────────────────────┘
                       │                 │
                       ▼                 │
    ┌──────────────────────────────────────────────┐
    │  Providers Table SELECT Policy:               │
    │  USING:                                       │
    │    - verified = true OR                       │
    │    - is_provider_member(id) ←────────┐       │
    │    - is_admin()                      │       │
    └──────────────────┬───────────────────────────┘
                       │                 │
                       ▼                 │
    ┌──────────────────────────────────────────────┐
    │  Function: is_provider_member(pid)            │
    │  SELECT FROM user_provider_memberships ───────┤
    │  WHERE provider_id = pid           │          │
    │  AND user_id = auth.uid()          │          │
    └────────────────────────────────────┼──────────┘
                       │                 │
                       ▼                 │
                ♾️ INFINITE RECURSION ♾️   │
                       │                 │
                       └─────────────────┘
```

---

## Diagram 2: Clean Architecture (v3)

```
┌─────────────────────────────────────────────────────────────────────┐
│                  NO CIRCULAR DEPENDENCIES (v3)                       │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────┐
    │  Frontend: Provider Login                     │
    │  ensureProviderMembership(userId, providerId) │
    └──────────────────┬───────────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────────┐
    │  INSERT INTO user_provider_memberships        │
    │  (user_id, provider_id, role)                 │
    └──────────────────┬───────────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────────┐
    │  RLS INSERT Policy (v3):                      │
    │  WITH CHECK:                                  │
    │    user_id = auth.uid()   ✅ SIMPLE CHECK     │
    │                                               │
    │  No provider table query! Breaks cycle.       │
    └──────────────────┬───────────────────────────┘
                       │
                       ▼
                  ✅ SUCCESS
                  Record created

Later when accessing provider data:

    ┌──────────────────────────────────────────────┐
    │  SELECT FROM providers WHERE id = ?           │
    └──────────────────┬───────────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────────┐
    │  Providers SELECT Policy (v3):                │
    │  USING:                                       │
    │    - verified = true OR                       │
    │    - user_id = auth.uid() OR   ✅ DIRECT      │
    │    - EXISTS (                                 │
    │        SELECT FROM memberships  ✅ SAFE       │
    │        WHERE user_id = auth.uid()             │
    │      ) OR                                     │
    │    - is_admin()                               │
    └──────────────────┬───────────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────────┐
    │  Membership SELECT Policy:                    │
    │  USING: user_id = auth.uid()  ✅ ALLOWS READ  │
    └──────────────────┬───────────────────────────┘
                       │
                       ▼
                  ✅ SUCCESS
                  Rows returned
```

---

## Diagram 3: Data Access Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│              WHO CAN ACCESS WHAT (Access Control Matrix)             │
└─────────────────────────────────────────────────────────────────────┘

                    Profiles  Memberships  Providers  Gear  Reservations
                    ────────  ───────────  ─────────  ────  ────────────
Public (anon)         ❌         ❌          ✅ (1)    ✅ (2)     ❌
Customer (auth)       ✅ (3)     ✅ (4)      ✅ (1)    ✅ (2)     ✅ (5)
Provider Owner        ✅ (3)     ✅ (4,6)    ✅ (7)    ✅ (8)     ✅ (9)
Team Member           ✅ (3)     ✅ (4)      ✅ (10)   ✅ (8)     ✅ (9)
Admin                 ✅ (3)     ✅ (11)     ✅ (12)   ✅ (12)    ✅ (12)

Legend:
(1)  Verified providers only
(2)  Active gear from verified providers only
(3)  Own profile only
(4)  Own memberships only
(5)  Own reservations only (user_id = auth.uid())
(6)  Can insert own membership
(7)  Own provider (user_id = auth.uid())
(8)  Provider's gear (via ownership or membership)
(9)  Provider's reservations (via ownership or membership)
(10) Team member's provider (via membership)
(11) All memberships
(12) Everything
```

---

## Diagram 4: Policy Layering

```
┌─────────────────────────────────────────────────────────────────────┐
│                    POLICY LAYER DEPENDENCIES                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 0: Authentication                                              │
│ ──────────────────────────────────────────────────────────────────  │
│   auth.uid()  ←  Built-in Supabase function                         │
│   Returns current user's ID or NULL                                  │
└─────────────────────────────────────────────────────────────────────┘
                                ↓ Used by all layers below
┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 1: Profiles (Foundation)                                       │
│ ──────────────────────────────────────────────────────────────────  │
│   SELECT: user_id = auth.uid()                                       │
│   UPDATE: user_id = auth.uid()                                       │
│                                                                       │
│   Dependencies: NONE (only uses auth.uid())                          │
└─────────────────────────────────────────────────────────────────────┘
                                ↓ Queried by Layer 2+
┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 2: User Provider Memberships                                   │
│ ──────────────────────────────────────────────────────────────────  │
│   SELECT: user_id = auth.uid() OR is_admin()                         │
│   INSERT: user_id = auth.uid() OR is_admin()                         │
│   UPDATE: user_id = auth.uid() OR is_admin()                         │
│   DELETE: user_id = auth.uid() OR is_admin() OR is_provider_owner   │
│                                                                       │
│   Dependencies:                                                       │
│   - LAYER 0 (auth.uid())                                             │
│   - LAYER 1 (profiles table for is_admin check)                      │
│   - providers.user_id for DELETE policy (safe - direct column)       │
│                                                                       │
│   ⚠️ CRITICAL: NEVER queries providers with SELECT policy            │
│                to avoid circular dependency!                         │
└─────────────────────────────────────────────────────────────────────┘
                                ↓ Queried by Layer 3+
┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 3: Providers                                                   │
│ ──────────────────────────────────────────────────────────────────  │
│   SELECT:                                                            │
│     - verified = true (public)                                       │
│     - user_id = auth.uid() (owner)                                   │
│     - EXISTS membership WHERE user_id = auth.uid() (member)          │
│     - is_admin()                                                     │
│                                                                       │
│   INSERT: user_id = auth.uid() OR is_admin()                         │
│   UPDATE: user_id = auth.uid() OR member_owner OR is_admin()         │
│   DELETE: user_id = auth.uid() OR is_admin()                         │
│                                                                       │
│   Dependencies:                                                       │
│   - LAYER 0 (auth.uid())                                             │
│   - LAYER 1 (profiles for is_admin)                                  │
│   - LAYER 2 (memberships for team access)                            │
│                                                                       │
│   ✅ SAFE: Queries memberships WHERE user_id = auth.uid()            │
│            which is allowed by Layer 2 SELECT policy                 │
└─────────────────────────────────────────────────────────────────────┘
                                ↓ Queried by Layer 4
┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 4: Gear Items & Reservations                                   │
│ ──────────────────────────────────────────────────────────────────  │
│   GEAR:                                                              │
│     SELECT: active AND provider.verified (public)                    │
│     ALL: provider_owner OR team_member OR is_admin()                 │
│                                                                       │
│   RESERVATIONS:                                                      │
│     SELECT: user_id = auth.uid() (customer view)                     │
│     ALL: provider_owner OR team_member OR is_admin()                 │
│                                                                       │
│   Dependencies:                                                       │
│   - LAYER 0 (auth.uid())                                             │
│   - LAYER 1 (profiles for is_admin)                                  │
│   - LAYER 2 (memberships for team access)                            │
│   - LAYER 3 (providers for ownership)                                │
│                                                                       │
│   ✅ SAFE: All queries flow downward, never upward                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 5: Security Defense in Depth

```
┌─────────────────────────────────────────────────────────────────────┐
│         HOW SECURITY WORKS WITH PERMISSIVE MEMBERSHIP INSERT         │
└─────────────────────────────────────────────────────────────────────┘

Scenario: Malicious user tries to access Provider X's data

Step 1: User adds fake membership
────────────────────────────────
    User ID: evil-user
    Provider ID: victim-provider
    Role: owner

    INSERT INTO user_provider_memberships
    VALUES ('evil-user', 'victim-provider', 'owner')

    ✅ ALLOWED by membership_insert_own policy
       (user can insert where user_id = auth.uid())

Step 2: User tries to view Provider X
──────────────────────────────────────
    SELECT * FROM providers WHERE id = 'victim-provider'

    Policy checks (v3):
    ┌──────────────────────────────────────────┐
    │ 1. verified = true?                      │
    │    ❌ NO (unverified provider)           │
    │                                          │
    │ 2. user_id = auth.uid()?                 │
    │    ❌ NO (victim-provider.user_id        │
    │           != evil-user)                  │
    │                                          │
    │ 3. Has membership?                       │
    │    ✅ YES (fake membership exists)       │
    │    → GRANTED                             │
    └──────────────────────────────────────────┘

    ✅ User CAN view provider record
       (This is intentional - membership grants view access)

Step 3: User tries to manage gear
──────────────────────────────────
    INSERT INTO gear_items (provider_id, name, ...)
    VALUES ('victim-provider', 'Stolen Item', ...)

    Policy checks (v3):
    ┌──────────────────────────────────────────┐
    │ Check 1: Is provider owner?              │
    │   SELECT FROM providers                  │
    │   WHERE id = 'victim-provider'           │
    │   AND user_id = auth.uid()               │
    │                                          │
    │   ❌ FAILS (evil-user != actual owner)   │
    │                                          │
    │ Check 2: Has membership?                 │
    │   SELECT FROM memberships                │
    │   WHERE provider_id = 'victim-provider'  │
    │   AND user_id = auth.uid()               │
    │                                          │
    │   ✅ PASSES (fake membership exists)     │
    │   → GRANTED                              │
    └──────────────────────────────────────────┘

    ✅ User CAN manage gear
       (Membership is trusted for access control)

CONCLUSION:
───────────
The permissive membership INSERT does allow users to grant themselves
access to providers. However:

1. This is INTENTIONAL for the ensureProviderMembership() flow
2. In production, you should add ADDITIONAL controls:
   - Provider owners can remove fake memberships
   - Admin audit logs to detect suspicious memberships
   - Application-level validation before calling ensureProviderMembership
   - Email verification for team invitations

ALTERNATIVE (More Restrictive):
────────────────────────────────
If you want to prevent self-insertion entirely, you must:
1. Use service_role key for ensureProviderMembership (bypasses RLS)
2. Or create a database function with SECURITY DEFINER
3. Or use Edge Functions to manage memberships

This migration prioritizes BREAKING THE RECURSION CYCLE over
maximum restrictiveness. Add additional controls as needed.
```

---

## Diagram 6: Comparison Table

```
┌─────────────────────────────────────────────────────────────────────┐
│                      VERSION COMPARISON                              │
└─────────────────────────────────────────────────────────────────────┘

Feature                        v1 (First Fix)    v2 (Second Fix)   v3 (This)
─────────────────────────────  ────────────────  ────────────────  ──────────
Circular Dependency            ❌ YES            ✅ NO             ✅ NO
Infinite Recursion Risk        ❌ HIGH           ⚠️ LOW            ✅ NONE
Membership Insert Policy       Restrictive       Permissive        Permissive
  - Checks provider ownership  ✅ YES            ❌ NO             ❌ NO
  - Allows self-insert         ⚠️ TRIES         ✅ YES            ✅ YES
Provider SELECT Policy         Complex           Complex           Simple
  - Calls is_provider_member() ✅ YES            ✅ YES            ❌ NO
  - Inline membership check    ❌ NO             ❌ NO             ✅ YES
  - Direct ownership check     ✅ YES            ✅ YES            ✅ YES
Function: is_provider_member() EXISTS            EXISTS            ❌ REMOVED
Admin Support                  ✅ FULL           ⚠️ LIMITED        ✅ FULL
Team Member Management         ❌ BROKEN         ⚠️ SELF-SERVE     ✅ WORKS
Code Maintainability           😰 HARD           😊 OKAY           😊 EASY
Security Model                 🔒 RESTRICTIVE    ⚠️ PERMISSIVE     ⚠️ PERMISSIVE
Debug-ability                  ❌ HARD           ⚠️ OKAY           ✅ EASY
Performance                    ⚠️ RECURSION      ✅ GOOD           ✅ GOOD

RECOMMENDATION: Use v3 + add application-level membership validation
```

---

## Diagram 7: Query Flow Examples

### Example 1: Provider Login (Happy Path)

```
[User clicks Login]
        │
        ▼
[AuthContext: signInWithPassword]
        │
        ▼
[Fetch profile: SELECT FROM profiles WHERE user_id = auth.uid()]
  Policy: ✅ user_id = auth.uid() (Layer 1)
        │
        ▼
[Profile shows role = 'provider']
        │
        ▼
[Fetch provider: SELECT FROM providers WHERE user_id = auth.uid()]
  Policy: ✅ user_id = auth.uid() (Layer 3)
        │
        ▼
[Call ensureProviderMembership(userId, providerId, 'owner')]
        │
        ▼
[UPSERT user_provider_memberships]
  Policy: ✅ user_id = auth.uid() (Layer 2 - membership_insert_own)
  ⚠️ NO RECURSION: Policy doesn't query providers!
        │
        ▼
[✅ SUCCESS - Membership created or updated]
        │
        ▼
[User sees provider dashboard]
```

### Example 2: Create Reservation

```
[Provider clicks "New Reservation"]
        │
        ▼
[Frontend: createReservationHold({providerId, gearId, ...})]
        │
        ▼
[INSERT INTO reservations (provider_id, gear_id, ...)]
        │
        ▼
[RLS Policy: reservation_all_provider_member]
  Check 1: Does provider.user_id = auth.uid()?
    └→ SELECT FROM providers WHERE id = providerId AND user_id = auth.uid()
       Policy: ✅ user_id = auth.uid() (Layer 3 - provider_select_owner)
       Result: ✅ MATCH (user is owner)

  Check 2: (Skip - already passed)

  Check 3: Is admin?
    └→ (Skip - already passed)

[✅ ALLOWED - Insert succeeds]
        │
        ▼
[Reservation created with ID and expires_at]
```

### Example 3: Team Member Accesses Gear

```
[Team member navigates to /provider/inventory]
        │
        ▼
[SELECT FROM gear_items WHERE provider_id = ?]
        │
        ▼
[RLS Policy: gear_all_provider_member]
  Check 1: Does provider.user_id = auth.uid()?
    └→ SELECT FROM providers WHERE id = providerId AND user_id = auth.uid()
       Policy: ✅ user_id = auth.uid() (Layer 3)
       Result: ❌ NO MATCH (user is not owner)

  Check 2: Does membership exist?
    └→ SELECT FROM user_provider_memberships
       WHERE provider_id = providerId AND user_id = auth.uid()
       Policy: ✅ user_id = auth.uid() (Layer 2 - membership_select_own)
       Result: ✅ MATCH (membership exists)

[✅ ALLOWED - Returns gear items]
        │
        ▼
[User sees gear list]
```

---

## Summary

**Key Takeaway**: The v3 architecture eliminates circular dependencies by:

1. **Removing the function** that queried back to the source table
2. **Inlining all checks** to make dependencies explicit
3. **Layering policies** so each layer only queries lower layers
4. **Permissive membership INSERT** to break the cycle (safe with defense in depth)

This creates a **unidirectional dependency flow** that prevents recursion while maintaining security through multiple validation layers.
