# 🚀 Operations Guide - Kitloop Gear Hub

**Single entry point for production operations**

---

## ⚡ QUICK START (3 Steps)

### Before Deploy
1. Run [Release Gate Checklist](RELEASE_GATE_CHECKLIST.md) (~12 min)
2. All 10/10 checks PASS → Deploy
3. Any check fails → Fix before deploy

### After Deploy
1. Check [24h Monitoring Plan](POST_DEPLOY_MONITORING.md) (5 min × 4 checks)
2. All checks green → Continue monitoring
3. Any NO-GO trigger → [Rollback](#rollback-quick-reference) (< 15 min)

### In Emergency
1. Open [Rollback Procedure](POST_DEPLOY_MONITORING.md#-gorollback-decision-matrix)
2. Follow steps (< 15 min total)
3. Document in incident log

---

## 📋 NAVIGATION TABLE

| Phase | Document | Time | Use When |
|-------|----------|------|----------|
| **Pre-Deploy** | [Release Gate Checklist](RELEASE_GATE_CHECKLIST.md) | 12 min | Before every production deploy |
| **Post-Deploy** | [24h Monitoring Plan](POST_DEPLOY_MONITORING.md) | 5 min × 4 | After production deploy (24h) |
| **Incident** | [Rollback Procedure](POST_DEPLOY_MONITORING.md#-gorollback-decision-matrix) | < 15 min | When NO-GO trigger fires |
| **CI/CD** | [CI Verification Report](CI_VERIFICATION_REPORT.md) | Reference | Understanding automated checks |
| **Process** | [Production Hardening Report](PRODUCTION_HARDENING_FINAL.md) | Reference | Gap analysis & lessons learned |

---

## 🔄 THE OPERATIONS LOOP

```
┌──────────────────────┐
│  CODE CHANGE         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  CI CHECKS (auto)    │ ◄── Lint, types, build, console guard
│  3 min               │
└──────────┬───────────┘
           │ PASS
           ▼
┌──────────────────────┐
│  RELEASE GATE        │ ◄── YOU ARE HERE (manual, 12 min)
│  10/10 checks        │     - Edge function tests
└──────────┬───────────┘     - DB security
           │ GO              - Audit logs
           ▼                 - E2E verification
┌──────────────────────┐
│  DEPLOY TO PROD      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  24H MONITORING      │ ◄── Check 4× (0h, 2h, 8h, 24h)
│  5 min × 4           │     - Edge function health
└──────────┬───────────┘     - Rate limiting
           │                 - Audit logs
      ┌────┴────┐            - Console leaks
      │         │
  ✅ PASS   ❌ FAIL
      │         │
      │         ▼
      │    ┌─────────────┐
      │    │  ROLLBACK   │
      │    │  < 15 min   │
      │    └─────────────┘
      │
      ▼
┌──────────────────────┐
│  PRODUCTION STABLE   │
└──────────────────────┘
```

---

## 🎯 COMMON SCENARIOS

### Scenario 1: Regular Code Change
```
1. Push to feature branch → CI runs (3 min)
2. CI passes → Open PR → CI runs again
3. Merge to main → Run Release Gate (12 min)
4. Gate passes → Deploy
5. 24h monitoring (4 checks)
```

### Scenario 2: Edge Function 5xx Errors
```
1. Detect in monitoring (Check 1)
2. Error rate > 20% → Immediate rollback trigger
3. Execute rollback (< 15 min)
4. Investigate root cause
5. Fix → Release Gate → Redeploy
```

### Scenario 3: Doc-Only Change
```
1. Push to main (docs/** change)
2. CI: Not triggered (paths-ignore)
3. No deployment needed
```

---

## 🚨 ROLLBACK QUICK REFERENCE

**Immediate triggers (no discussion):**
- 🔴 5xx errors > 10/hour
- 🔴 PII visible in console
- 🔴 Audit log missing for 200 response
- 🔴 anon/authenticated can read admin tables

**Procedure (< 15 min):**
```bash
# 1. Revert (2 min)
git revert HEAD~N..HEAD

# 2. Rebuild (2 min)
npm run build

# 3. Redeploy (3 min)
supabase functions deploy admin_action
# Netlify: drag & drop dist/

# 4. Verify (3 min)
curl test → expect 400 (not 5xx)

# 5. Document (5 min)
# - What failed
# - When reverted
# - Root cause
# - Next steps
```

**Full details:** [POST_DEPLOY_MONITORING.md](POST_DEPLOY_MONITORING.md#-gorollback-decision-matrix)

---

## 🤖 AUTOMATED SAFEGUARDS

**CI Pipeline:** `.github/workflows/release-gate.yml`

**Runs on:** Every code/config change (not docs)  
**Blocks:** PR merge if failing  
**Checks:** Lint, types, build, console guard

**Smart features:**
- Path filtering (only relevant changes)
- Concurrency control (cancels old builds)
- Node 22 (matches local environment)

**Details:** [CI_VERIFICATION_REPORT.md](CI_VERIFICATION_REPORT.md)

---

## 📖 ADDITIONAL RESOURCES

### Core Documentation
- [Release Gate Checklist](RELEASE_GATE_CHECKLIST.md) - Pre-deploy verification (12 min)
- [24h Monitoring Plan](POST_DEPLOY_MONITORING.md) - Post-deploy checks (5 min × 4)
- [CI Verification Report](CI_VERIFICATION_REPORT.md) - Automated checks explained
- [Production Hardening](PRODUCTION_HARDENING_FINAL.md) - Gap analysis & lessons

### Historical Context
- [P0 Verification Complete](../P0_VERIFICATION_COMPLETE.md) - Security audit
- [Production Deployment Success](../PRODUCTION_DEPLOYMENT_SUCCESS.md) - Timeline

---

## 🎓 SUCCESS METRICS

**This operations loop is effective when:**
1. All deployments pass release gate checks
2. Rollbacks (if needed) complete in < 15 min
3. Team executes without bottlenecks
4. Audit trail exists for every deployment
5. Regression risk materially reduced via enforced gates

**NOT success criteria (unrealistic):**
- ❌ Zero incidents ever (some are unavoidable)
- ❌ Zero rollbacks (occasional rollbacks are healthy)
- ❌ 100% automation (human judgment critical)

---

## 📏 DOCUMENT GOVERNANCE

**CRITICAL:** Keep this file ultra-short (60-120 lines target)

**If you need to add content:**
1. ❌ DON'T add to this file
2. ✅ Create new detailed guide (e.g., `NEW_FEATURE_OPS.md`)
3. ✅ Add link to navigation table above
4. ✅ Keep this as entry point only

**Why:** Entry point = table of contents, NOT detailed guide

**Current size:** ~120 lines ✅  
**Review:** Quarterly or when adding new process

---

**Last Updated:** 2026-01-11  
**Version:** 1.1 (Streamlined)  
**Owner:** Engineering Team
