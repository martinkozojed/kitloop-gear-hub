# GitHub Branch Protection Setup

**Purpose:** Enforce CI checks before merge (even for solo developers)  
**Time:** 2 minutes  
**Frequency:** Once (after first deployment)

---

## 🎯 WHY THIS MATTERS

**Problem:** CI workflow exists but can be bypassed

```bash
# Without branch protection:
git commit -m "quick fix"
git push origin main  # ❌ CI fails but merge succeeds

# With branch protection:
git push origin main  # ✅ CI fails → push rejected
```

**Even solo developers need this** - prevents "tired Friday afternoon" merges.

---

## 📋 SETUP STEPS (2 minutes)

### 1. Open Repository Settings

```
1. Go to: https://github.com/martinkozojed/kitloop-gear-hub
2. Click: Settings (top menu)
3. Left sidebar: Branches
```

### 2. Add Branch Protection Rule

**Click:** "Add rule" or "Add branch protection rule"

**Branch name pattern:** `main`

### 3. Required Settings (MINIMUM)

**✅ Enable these:**

#### A) Require status checks to pass before merging
```
☑ Require status checks to pass before merging
  ☑ Require branches to be up to date before merging
  
Status checks that are required:
  ☑ release-gate  ← Type this and select from dropdown
```

**Why:** Blocks merge if CI fails

#### B) (Optional but Recommended) Require pull request
```
☑ Require a pull request before merging
  Number of approvals: 0  (solo) or 1+ (team)
```

**Why:** Forces code review workflow (even for self-review)

#### C) (Optional) Restrict who can push
```
☑ Do not allow bypassing the above settings
```

**Why:** Even admins must follow the rules

### 4. Save Changes

**Click:** "Create" or "Save changes" (bottom of page)

---

## ✅ VERIFICATION (30 seconds)

### Test 1: Direct Push (Should Fail)
```bash
# Try to push directly to main
echo "test" >> README.md
git commit -m "test: should fail if protection works"
git push origin main

# Expected: ❌ REJECTED
# "Required status check 'release-gate' is expected"
```

### Test 2: PR Workflow (Should Require Check)
```bash
# Proper workflow
git checkout -b test/branch-protection
echo "test" >> README.md
git commit -m "test: branch protection"
git push origin test/branch-protection

# Open PR on GitHub
# Expected: ✅ Can create PR
#           ⏳ Merge button disabled until CI passes
#           ✅ Merge enabled after CI passes
```

---

## 🎓 RECOMMENDED SETTINGS BY TEAM SIZE

### Solo Developer (Minimum)
```
✅ Require status checks: release-gate
❌ Require PR: Optional (self-discipline)
❌ Restrict push: Optional
```

**Trade-off:** Flexibility vs safety

### Small Team (2-5 people)
```
✅ Require status checks: release-gate
✅ Require PR: Yes (1 approval)
❌ Restrict push: Optional
```

**Trade-off:** Code review culture

### Production Team (5+ people)
```
✅ Require status checks: release-gate
✅ Require PR: Yes (1-2 approvals)
✅ Restrict push: Yes (only via PR)
✅ Require signed commits (optional)
```

**Trade-off:** Maximum safety

---

## 🚨 EMERGENCY BYPASS (Use Sparingly)

**Scenario:** Production is down, urgent hotfix needed, CI is broken.

**Options:**

### Option 1: Temporary Disable (Recommended)
1. GitHub Settings → Branches → Edit rule
2. Uncheck "Require status checks"
3. Merge hotfix
4. Re-enable immediately

### Option 2: Admin Override (GitHub Enterprise only)
- Admins can force-push with `--force-with-lease`
- Creates audit trail
- Requires explicit permission

### Option 3: Fix CI First (Best)
- Fix CI in separate PR
- Then merge actual hotfix
- Maintains safety

**Rule:** Never bypass for convenience, only for production incidents.

---

## 📊 MONITORING

### Check Protection Status
```bash
# Via GitHub CLI
gh api repos/martinkozojed/kitloop-gear-hub/branches/main/protection

# Expected output:
# - required_status_checks: ["release-gate"]
# - required_pull_request_reviews: {...}
```

### Audit Bypass Events
```
GitHub → Settings → Actions → General → Workflow permissions
Check: "Read and write permissions" are NOT allowed
```

---

## 🔗 RELATED DOCUMENTATION

- [Release Gate Checklist](RELEASE_GATE_CHECKLIST.md) - What CI checks
- [Operations Guide](OPERATIONS.md) - Full deployment workflow
- [CI Verification Report](CI_VERIFICATION_REPORT.md) - How CI works

---

## 📝 TROUBLESHOOTING

### "Status check not found"
**Problem:** CI hasn't run yet on this branch  
**Solution:** Push a commit to trigger CI, then check appears

### "Required status check is expected"
**Problem:** Protection is working correctly  
**Solution:** Create PR → wait for CI → merge

### "Merge button is disabled"
**Cause 1:** CI is still running (wait)  
**Cause 2:** CI failed (fix code)  
**Cause 3:** Not up to date with main (rebase)

---

## ✅ SUCCESS CRITERIA

**Branch protection is working when:**
1. ✅ Cannot push directly to main without passing CI
2. ✅ PR shows "Merging is blocked" until CI passes
3. ✅ Merge button enables only after status check passes
4. ✅ Bypass requires explicit admin action (audit trail)

---

**Last Updated:** 2026-01-11  
**Setup Time:** 2 minutes  
**Maintenance:** Rarely (only when adding new status checks)
