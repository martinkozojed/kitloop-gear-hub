# 🚀 Operations Guide - Kitloop Gear Hub

**Single source of truth for production operations**

---

## 📋 QUICK NAVIGATION

| Phase | Document | Time | Use When |
|-------|----------|------|----------|
| **Pre-Deploy** | [Release Gate Checklist](RELEASE_GATE_CHECKLIST.md) | 12 min | Before every production deploy |
| **Post-Deploy** | [24h Monitoring Plan](POST_DEPLOY_MONITORING.md) | 5 min × 4 | After production deploy (24h) |
| **Incident** | [Rollback Procedure](#rollback-quick-reference) | < 15 min | When NO-GO trigger fires |
| **CI/CD** | [CI Verification Report](CI_VERIFICATION_REPORT.md) | Reference | Understanding automated checks |

---

## 🎯 THE OPERATIONS LOOP

```
┌─────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOY                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  RELEASE GATE (12m)  │ ◄── You are here before deploy
          │  ✅ 10/10 checks     │
          └──────────┬───────────┘
                     │ PASS
                     ▼
          ┌──────────────────────┐
          │   DEPLOY TO PROD     │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ POST-DEPLOY MONITOR  │ ◄── Check 4× in first 24h
          │  (5 min × 4 checks)  │
          └──────────┬───────────┘
                     │
                ┌────┴────┐
                │         │
           ✅ PASS    ❌ FAIL
                │         │
                │         ▼
                │    ┌─────────────────┐
                │    │ ROLLBACK (15m)  │
                │    │ + Root cause    │
                │    └─────────────────┘
                │
                ▼
          ┌──────────────────────┐
          │  PRODUCTION STABLE   │
          │  Continue monitoring │
          └──────────────────────┘
```

---

## 📖 DETAILED PHASE GUIDES

### 1️⃣ PRE-DEPLOYMENT: Release Gate

**Document:** [RELEASE_GATE_CHECKLIST.md](RELEASE_GATE_CHECKLIST.md)  
**Time:** ~12 minutes  
**Frequency:** Before EVERY production deploy

**What it covers:**
- ✅ Automated checks (CI enforced)
- ✅ Edge function tests (400/401/403/200/429)
- ✅ Database security (RLS, privileges)
- ✅ Audit log verification
- ✅ Edge function health (invocations, errors)

**Artifacts to save:**
1. Console guard output
2. Endpoint test results (tokens redacted)
3. DB security verification
4. Audit log sample
5. Edge function logs
6. Git commit info

**GO/NO-GO Decision:**
- ✅ GO: All 10/10 checks PASS
- ❌ NO-GO: Any check fails → fix before deploy

---

### 2️⃣ POST-DEPLOYMENT: 24h Monitoring

**Document:** [POST_DEPLOY_MONITORING.md](POST_DEPLOY_MONITORING.md)  
**Time:** 5 minutes per check  
**Frequency:** 4× in first 24 hours (0h, 2h, 8h, 24h)

**What to check:**

#### Check 1: Edge Function Health (2 min)
- Invocations: > 0 (expected from release gate tests)
- Error rate: < 5%
- Recent logs: No unexpected 5xx

#### Check 2: Rate Limiting (1 min)
```sql
SELECT admin_id, action_count, window_start
FROM admin_rate_limits
WHERE window_start > now() - interval '1 hour'
ORDER BY action_count DESC;
```
- Expected: Normal admin activity
- Red flag: Single admin > 15 actions/hour

#### Check 3: Audit Log Spot Check (1 min)
```sql
SELECT action, COUNT(*), MIN(created_at), MAX(created_at)
FROM admin_audit_logs
WHERE created_at > now() - interval '24 hours'
GROUP BY action;
```
- Expected: Distribution matches normal admin activity
- Red flag: Unusual spikes or zero logs

#### Check 4: Console Leak Check (1 min)
- Open production site: https://kitloop.cz
- DevTools Console → check for PII leaks
- Expected: No log/info/debug, only warn/error (if any)

**Rollback Triggers:** See [Rollback Decision Matrix](#rollback-quick-reference)

---

### 3️⃣ INCIDENT RESPONSE: Rollback

**Time:** < 15 minutes  
**Trigger:** Any NO-GO condition detected

**Quick Reference:**

#### Immediate Rollback (No Discussion)
1. 🔴 5xx errors > 10 in 1 hour
2. 🔴 PII visible in console
3. 🔴 Audit log missing for 200 responses
4. 🔴 anon/authenticated can read admin tables

#### Investigate & Decide (1h window)
5. 🟡 Error rate 10-20% for > 30 min
6. 🟡 Same admin hits rate limit > 5×/hour
7. 🟡 > 50 admin actions in 1 hour

**Rollback Procedure:**
```bash
# 1. Revert commits (< 2 min)
git revert HEAD~N..HEAD  # N = number of bad commits

# 2. Rebuild (< 2 min)
npm run build

# 3. Redeploy (< 3 min)
supabase functions deploy admin_action
# Netlify: drag & drop dist/ or CLI deploy

# 4. Quick smoke test (< 3 min)
curl -X POST $URL/admin_action \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"invalid",...}'
# Expect: 400 (not 429, not 5xx)

# 5. Document (< 5 min)
# - Reverted commits
# - Deployment timestamp
# - Root cause
# - Next steps
```

**Full Details:** [POST_DEPLOY_MONITORING.md - Rollback Section](POST_DEPLOY_MONITORING.md#-gorollback-decision-matrix)

---

## 🤖 AUTOMATED SAFEGUARDS

### CI/CD Pipeline

**Workflow:** `.github/workflows/release-gate.yml`  
**Runs on:** Every push to relevant paths  
**Blocks:** PR merge if failing

**What it checks:**
1. ✅ Linting (no-console rule, etc.)
2. ✅ Type checking (TypeScript)
3. ✅ Production build (no errors)
4. ✅ Console guard script (no PII leaks)

**Smart Features:**
- 🎯 Path filtering: Only runs on code/config changes (not docs)
- 🔄 Concurrency: Cancels old builds when pushing rapidly
- 🔢 Node 22: Matches local environment

**Details:** [CI_VERIFICATION_REPORT.md](CI_VERIFICATION_REPORT.md)

---

## 📊 METRICS DASHBOARD (Quick Spot Checks)

### Supabase Dashboard → Edge Functions → admin_action

**Green Signals:**
- ✅ Invocations: Steady (matches admin activity)
- ✅ Error rate: < 5%
- ✅ Avg duration: < 500ms
- ✅ Recent logs: Mix of 200/400/401/403, rare 429

**Yellow Signals (Investigate):**
- ⚠️ Error rate: 5-20%
- ⚠️ Invocation spike (> 50/hour)
- ⚠️ Duration spike (> 2s)

**Red Signals (Rollback):**
- 🔴 Error rate: > 20%
- 🔴 5xx errors appearing
- 🔴 Zero invocations (broken)
- 🔴 "Function crashed" messages

---

## 🎓 COMMON SCENARIOS

### Scenario 1: Doc-only change
**Action:** Push to main  
**CI Result:** ❌ Not triggered (docs ignored)  
**Deploy:** Optional (no code change)

### Scenario 2: Fix typo in src/
**Action:** Push to feature branch  
**CI Result:** ✅ Triggered, checks all 4 gates  
**Next:** If PASS, open PR → CI runs again → merge

### Scenario 3: Update tailwind.config.ts
**Action:** Push to main  
**CI Result:** ✅ Triggered (config affects build)  
**Before deploy:** Run release gate checklist  
**After deploy:** 4× monitoring (24h)

### Scenario 4: Edge function returning 5xx
**Detection:** Post-deploy monitoring (Check 1)  
**Decision:** Immediate rollback (< 15 min)  
**Next:** Root cause analysis, fix, re-deploy with gate

### Scenario 5: Rapid iteration (3 pushes)
**CI Behavior:** Only last push builds (concurrency)  
**Benefit:** Saves CI minutes, faster feedback

---

## 🔗 REFERENCE DOCUMENTS

### Core Operations
- [Release Gate Checklist](RELEASE_GATE_CHECKLIST.md) - Pre-deploy verification
- [Post-Deploy Monitoring](POST_DEPLOY_MONITORING.md) - 24h watch plan
- [CI Verification Report](CI_VERIFICATION_REPORT.md) - Automated checks explained

### Historical Context
- [P0 Verification Complete](../P0_VERIFICATION_COMPLETE.md) - Original security audit
- [Production Deployment Success](../PRODUCTION_DEPLOYMENT_SUCCESS.md) - Deployment timeline

### Process Evolution
- [Status](STATUS.md) - Project status
- [Next Steps](NEXT.md) - Roadmap

---

## 📞 ESCALATION

### Level 1: Automated (No Human)
- ✅ CI blocks bad code
- ✅ Console guard prevents PII leaks
- **Time:** 3 minutes (CI run)

### Level 2: Release Gate (Manual)
- ✅ Engineer runs checklist
- ✅ GO/NO-GO decision
- **Time:** 12 minutes

### Level 3: Monitoring (Scheduled)
- ✅ Periodic checks (4× in 24h)
- ✅ Catch production issues early
- **Time:** 5 minutes per check

### Level 4: Incident (Reactive)
- 🔴 Rollback triggered
- 🔴 Root cause analysis
- **Time:** < 15 minutes rollback + investigation

---

## 🏆 SUCCESS CRITERIA

**This operations loop is successful if:**
1. ✅ Zero production incidents from preventable causes
2. ✅ All deployments pass release gate
3. ✅ Rollback (if needed) completes in < 15 min
4. ✅ Team can execute without bottlenecks
5. ✅ Audit trail exists for every deployment

**Not success criteria (unrealistic):**
- ❌ Zero bugs ever (impossible)
- ❌ Zero rollbacks (some are unavoidable)
- ❌ 100% automation (human judgment needed)

**Professional claim:**
> "Regression risk materially reduced; operations loop enforces key invariants."

---

## 📝 VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-11 | Initial operations guide created |

---

**Last Updated:** 2026-01-11  
**Owner:** Engineering Team  
**Review Frequency:** Quarterly or after major incidents
