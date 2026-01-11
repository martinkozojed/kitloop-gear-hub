# 🔍 Dashboard Data Analysis - Current State

**Date:** 2026-01-11  
**Goal:** Verify what data issues actually exist vs what audit reported  
**Status:** 🟢 IN PROGRESS

---

## 📊 CURRENT STATE VERIFICATION

### 1. KPI Data (from useDashboardData hook)

**What's loaded:**
```typescript
// src/hooks/useDashboardData.ts:29-62
const kpiQuery = useQuery({
  queryFn: async (): Promise<KpiData> => {
    // Active Rentals
    const { count: pickupCount } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', provider.id)
      .eq('status', 'active');
    
    // Returns Today
    const { count: returnsTodayCount } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', provider.id)
      .eq('status', 'active')
      .gte('end_date', todayIso)
      .lt('end_date', tomorrowIso);
    
    return {
      activeRentals: pickupCount || 0,          // ✅ REAL DATA
      returnsToday: returnsTodayCount || 0,     // ✅ REAL DATA
      dailyRevenue: 0,                          // ❌ HARDCODED 0
      activeTrend: "+12% this week",            // ❌ HARDCODED
      activeTrendDir: "up",                     // ❌ HARDCODED
      returnsTrend: "On schedule",              // ❌ HARDCODED
      returnsTrendDir: "neutral",               // ❌ HARDCODED
      revenueTrend: "+5% vs yesterday",         // ❌ HARDCODED
      revenueTrendDir: "up"                     // ❌ HARDCODED
    };
  }
});
```

**Analysis:**
- ✅ `activeRentals` - Real DB query
- ✅ `returnsToday` - Real DB query  
- ❌ `dailyRevenue` - Always 0 (not calculated)
- ❌ Trends - All hardcoded strings

---

### 2. Agenda Data (Pickups & Returns)

**What's loaded:**
```typescript
// src/hooks/useDashboardData.ts:65-150
const agendaQuery = useQuery({
  queryFn: async (): Promise<AgendaItemProps[]> => {
    const { data: rawAgenda } = await supabase
      .from('reservations')
      .select(`id, start_date, end_date, status, customer_name, ...`)
      .eq('provider_id', provider.id)
      .in('status', ['hold', 'confirmed', 'active', 'completed'])  // ✅ INCLUDES HOLD
      .or(`start_date.gte.${todayIso},end_date.gte.${todayIso}`)
      .limit(50);
    
    // Pickups: start_date is today AND status = confirmed/hold
    if (isTodayStart && (r.status === 'confirmed' || r.status === 'hold')) {
      mappedAgenda.push({
        type: 'pickup',
        time: format(sDate, 'HH:mm'),      // ✅ REAL TIME
        customerName: r.customer_name,      // ✅ REAL DATA
        itemCount: 1,                       // ❌ HARDCODED (should query items)
        status: uiStatus,                   // ✅ CALCULATED
        ...
      });
    }
    
    // Returns: end_date is today AND status = active/completed
    if (isTodayEnd && ['active', 'completed'].includes(r.status)) {
      mappedAgenda.push({
        type: 'return',
        time: format(eDate, 'HH:mm'),      // ✅ REAL TIME
        customerName: r.customer_name,      // ✅ REAL DATA
        itemCount: 1,                       // ❌ HARDCODED (should query items)
        status: isReturned ? 'completed' : 'active',
        ...
      });
    }
  }
});
```

**Analysis:**
- ✅ Pickups/Returns - Real queries with correct date filtering
- ✅ Status filtering - Includes 'hold', 'confirmed', 'active', 'completed'
- ✅ Times - Real data from DB
- ❌ `itemCount: 1` - Hardcoded placeholder (should count actual items)

---

### 3. Exceptions Queue

**What's loaded:**
```typescript
// src/hooks/useDashboardData.ts:152-180
const exceptionsQuery = useQuery({
  queryFn: async (): Promise<ExceptionItem[]> => {
    const { data: overdueData } = await supabase
      .from('reservations')
      .select('id, end_date, customer_name')
      .eq('provider_id', provider.id)
      .in('status', ['active'])          // ✅ ONLY ACTIVE (correct)
      .lt('end_date', todayIso);         // ✅ END DATE < TODAY
    
    return overdueData.map((o) => ({
      id: o.id,
      type: 'overdue',
      message: `Overdue since ${format(new Date(o.end_date), 'd.M.')}`,
      priority: 'high',
      customer: o.customer_name || 'Unknown'
    }));
  }
});
```

**Analysis:**
- ✅ Overdue items - Real query
- ✅ Correct logic (active items past end_date)
- ❌ Only shows "overdue", doesn't show "unpaid" exceptions

---

## 🚨 ISSUES FOUND

### Issue #1: Daily Revenue Always 0
**Location:** `src/hooks/useDashboardData.ts:51`  
**Current:** `dailyRevenue: 0`  
**Expected:** Calculate from active reservations

**Fix Required:**
```typescript
// Calculate revenue from active reservations
const { data: activeReservations } = await supabase
  .from('reservations')
  .select('total_price')
  .eq('provider_id', provider.id)
  .eq('status', 'active');

const dailyRevenue = activeReservations?.reduce(
  (sum, r) => sum + (r.total_price || 0), 
  0
) || 0;
```

---

### Issue #2: Item Count Hardcoded to 1
**Location:** `src/hooks/useDashboardData.ts:117, 136`  
**Current:** `itemCount: 1 // Placeholder`  
**Expected:** Count actual reservation items

**Problem:** 
- Single query doesn't join with reservation_items
- Need to either:
  A) Add join to query (complex)
  B) Keep placeholder (acceptable for MVP)

**Decision:** ⏸️ SKIP - Low priority, doesn't affect operations

---

### Issue #3: Hardcoded Trends
**Location:** `src/hooks/useDashboardData.ts:52-57`  
**Current:** All trends are static strings  
**Expected:** Calculate real trends from historical data

**Fix Required:**
- Query previous week data
- Calculate % change
- Update trend direction

**Decision:** ⏸️ SKIP - Nice-to-have, not critical for operations

---

### Issue #4: Unpaid Exceptions Missing
**Location:** `src/hooks/useDashboardData.ts:152-180`  
**Current:** Only shows overdue items  
**Expected:** Also show unpaid reservations

**Fix Required:**
```typescript
// Add unpaid query
const { data: unpaidData } = await supabase
  .from('reservations')
  .select('id, start_date, customer_name')
  .eq('provider_id', provider.id)
  .in('status', ['confirmed', 'hold'])
  .eq('payment_status', 'unpaid')
  .gte('start_date', todayIso)
  .lt('start_date', tomorrowIso);

// Add to exceptions array
```

**Decision:** 🔄 CONSIDER - Useful for operations

---

## ✅ WHAT DASHBOARD_AUDIT_REPORT SAID

### Claimed Issue: "Hardcoded 3 pending confirmations"
**Location Cited:** `DashboardOverview.tsx:362`  
**Current Reality:** ❌ **NOT FOUND** - This line doesn't exist in current code

**Possible Explanations:**
1. Already fixed in previous commit
2. Audit was done on older version
3. Referenced different component

**Verdict:** ✅ **NON-ISSUE** - Not reproducible in current codebase

---

### Claimed Issue: "Today's pickups/returns always 0"
**Location Cited:** `DashboardOverview.tsx:124-125`  
**Current Reality:** ❌ **NOT FOUND** - These TODOs don't exist

**Actual State:**
- Hook queries real pickups/returns ✅
- Data is calculated correctly ✅
- Displays in agenda correctly ✅

**Verdict:** ✅ **ALREADY FIXED** or **NON-ISSUE**

---

## 🎯 PRIORITY FIXES

### HIGH PRIORITY (Do Now):
1. ✅ **Daily Revenue Calculation** - Easy fix, high value
   - Time: 30 min
   - Risk: LOW (just query + sum)
   - Impact: Shows real revenue to provider

### MEDIUM PRIORITY (Consider):
2. 🔄 **Unpaid Exceptions** - Useful for operations
   - Time: 30 min
   - Risk: LOW
   - Impact: Provider sees unpaid reservations

### LOW PRIORITY (Skip):
3. ⏸️ **Item Count** - Placeholder OK for MVP
4. ⏸️ **Trends** - Nice-to-have, not critical

---

## 📋 NEXT ACTIONS

### Step 1: Fix Daily Revenue (SAFE)
- Query total_price from active reservations
- Sum the values
- Return in kpiData
- Test: Verify KPI card shows correct amount

### Step 2: Add Unpaid Exceptions (OPTIONAL)
- Query unpaid reservations for today
- Add to exceptions array
- Test: Verify exceptions queue shows both overdue + unpaid

### Step 3: Verify & Test
- Manual test in browser
- Check that numbers make sense
- Commit incrementally

---

**Status:** ✅ Analysis complete  
**Decision:** Fix dailyRevenue first (high value, low risk)  
**ETA:** 30 minutes

