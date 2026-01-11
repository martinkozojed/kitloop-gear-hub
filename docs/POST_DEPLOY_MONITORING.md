# 👀 Post-Deploy Monitoring - 24 Hours

**Purpose:** Early detection of issues after admin action deployment  
**Duration:** First 24 hours post-deploy  
**Frequency:** Check 3x per day (morning, afternoon, evening)

---

## 🕐 MONITORING SCHEDULE

### Day 1 Post-Deploy

| Time | Check | Owner |
|------|-------|-------|
| **T+1h** | Immediate smoke test | Deployer |
| **T+8h** | Morning check | On-call |
| **T+16h** | Afternoon check | On-call |
| **T+24h** | Final check | On-call |

---

## ✅ WHAT TO CHECK (Each Session)

### 1. Edge Function Health (2 min)

**Invocations & Errors:**
```
https://supabase.com/dashboard/project/PROJECT_ID/functions/admin_action
→ Check "Invocations" tab
```

**Look for:**
- ✅ Invocation count increasing (sign of use)
- ❌ **Alert if:** Error rate > 5%
- ❌ **Alert if:** 5xx spike (backend issues)
- ❌ **Alert if:** Zero invocations (might be broken)

**Baseline:**
- Normal: 5-20 invocations/day
- Error rate: < 2%

---

### 2. Rate Limiting Check (1 min)

**Query:**
```sql
-- Check rate limit table
SELECT 
  admin_id,
  action_count,
  window_start,
  last_action_at,
  now() - window_start as window_age
FROM public.admin_rate_limits
ORDER BY last_action_at DESC
LIMIT 10;
```

**Look for:**
- ✅ `action_count` mostly < 20 (normal usage)
- ❌ **Alert if:** Same admin has `action_count = 20` repeatedly (hitting limit often)
- ❌ **Alert if:** Very high action_count (shouldn't exceed 20)
- ❌ **Alert if:** Stale windows (not resetting)

**Baseline:**
- Normal: 1-10 actions per admin per window
- Concern: > 15 actions regularly (might need limit increase)

---

### 3. Audit Log Spot Check (2 min)

**Query:**
```sql
-- Last 20 admin actions
SELECT 
  action,
  target_id,
  reason,
  created_at,
  -- NO admin_id or PII fields!
  metadata->>'timestamp' as action_time
FROM public.admin_audit_logs
ORDER BY created_at DESC
LIMIT 20;
```

**Look for:**
- ✅ Actions are being logged
- ✅ Reasonable distribution of approve/reject
- ❌ **Alert if:** No new logs (might be broken)
- ❌ **Alert if:** Suspicious patterns (mass approvals, etc.)
- ❌ **Alert if:** PII visible in logs (should be redacted)

**DO NOT:**
- ❌ Query with admin_id visible (GDPR)
- ❌ Share logs with identifiable data
- ❌ Query full metadata (might contain PII)

**Baseline:**
- Normal: 2-10 actions/day
- Concern: > 50 actions/day (check for abuse)

---

### 4. Console Leak Check (30 sec)

**Manual test on https://kitloop.cz:**
1. Open DevTools Console
2. Execute: `console.log("leak test")`
3. Check: No output? ✅

**Random user flow:**
- Login → Dashboard → Any action
- Watch console: No logs? ✅

❌ **Alert if:** Any `console.log` visible

---

## 🚨 ALERT THRESHOLDS

### Critical (Immediate Action):
- 🔴 **PII visible in console** → Rollback immediately
- 🔴 **Error rate > 20%** → Investigate logs, consider rollback
- 🔴 **No audit logs created** → Admin actions not working
- 🔴 **anon/authenticated can read admin tables** → Security breach

### Warning (Investigate Soon):
- 🟡 **Error rate 5-20%** → Check edge function logs
- 🟡 **Rate limit hit frequently** → Consider limit increase
- 🟡 **Unusual action patterns** → Spot check with admin
- 🟡 **High invocation spike** → Possible abuse or bug

### Info (Note Only):
- 🟢 **Low invocation count** → Normal (admins don't act daily)
- 🟢 **All approve actions** → Normal (if in onboarding phase)
- 🟢 **Old rate limit entries** → Normal (cleanup after 24h)

---

## 📊 REPORTING TEMPLATE

**Daily Report (Slack/Email):**
```
🔒 Admin Action Monitoring - Day 1 Post-Deploy

✅ Edge Function: XX invocations, X.X% errors (baseline: <2%)
✅ Rate Limiting: Max count XX/20, XX admins active
✅ Audit Logs: XX new entries, no anomalies
✅ Console Leak: Tested, no leaks detected

🟢 Status: HEALTHY
⬜ Action: None required

Report by: [Name]
Time: [Timestamp]
```

**If Issues Found:**
```
⚠️ Admin Action Monitoring - Day 1 Post-Deploy

⚠️ Issue Detected:
- [Describe issue]
- Severity: [Critical/Warning/Info]
- First seen: [Time]

🔧 Action Taken:
- [What was done]
- [Result]

📋 Next Steps:
- [Follow-up actions]

Report by: [Name]
Time: [Timestamp]
```

---

## 🔗 QUICK LINKS

**Supabase Dashboard:**
- Functions: https://supabase.com/dashboard/project/PROJECT_ID/functions/admin_action
- Logs: https://supabase.com/dashboard/project/PROJECT_ID/logs
- SQL Editor: https://supabase.com/dashboard/project/PROJECT_ID/sql

**Documentation:**
- Release Gate: `docs/RELEASE_GATE_CHECKLIST.md`
- Final Status: `P0_VERIFICATION_COMPLETE.md`
- Troubleshooting: `REMAINING_RISKS_SUMMARY.md`

---

## 📝 CHECKLIST (Per Check)

**T+1h / T+8h / T+16h / T+24h:**

- [ ] Check edge function invocations
- [ ] Check error rate (< 5%)
- [ ] Query rate limiting table
- [ ] Spot check audit logs (last 20)
- [ ] Manual console leak test
- [ ] Document any anomalies
- [ ] Post status update

**Total time per check:** ~5 minutes

---

## ✅ SIGN-OFF

After 24h monitoring with no critical issues:

**Monitoring Complete:**
- Date: ____________
- Checks completed: 4/4
- Critical issues: 0
- Warning issues: 0
- Status: ✅ STABLE

**Deployment Sign-Off:** ✅ APPROVED FOR LONG-TERM

**Next Review:** 7 days (weekly spot check)

---

**Created:** 2026-01-11  
**Version:** 1.0  
**Owner:** Operations Team
