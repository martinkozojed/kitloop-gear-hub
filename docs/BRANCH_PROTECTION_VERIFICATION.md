# Branch Protection Verification Tests

**Purpose:** Prove branch protection actually blocks bad code  
**Time:** 5 minutes (2 tests)  
**Prerequisite:** Branch protection must be set up first

---

## 🎯 OVERVIEW

Two quick tests to verify the entire CI + branch protection stack:

1. **Test A:** Intentional CI failure → merge blocked ✅
2. **Test B:** Doc-only change → CI skipped ✅

**If both pass:** Production system is bulletproof 🎊

---

## ✅ TEST A: Gate Actually Blocks (3 minutes)

### Purpose
Prove that bad code cannot be merged even by admins.

### Steps

#### 1. Create Test Branch
```bash
cd /Users/mp/Downloads/kitloop-gear-hub-main
git checkout -b test/ci-block
```

#### 2. Add Intentional console.log
```bash
# Edit any component file
echo "console.log('TEST: This should fail CI!');" >> src/App.tsx

# Or create new test file
cat > src/test-intentional-fail.tsx << 'EOF'
// Intentional CI failure test
console.log("This violates no-console rule");

export function TestComponent() {
  return <div>Test</div>;
}
EOF
```

#### 3. Commit and Push
```bash
git add -A
git commit -m "test: intentional console.log to verify CI blocks merge"
git push origin test/ci-block
```

#### 4. Open Pull Request

**Via GitHub CLI:**
```bash
gh pr create \
  --title "TEST: Intentional CI failure" \
  --body "This PR should be blocked by release-gate check" \
  --base main \
  --head test/ci-block
```

**Via GitHub UI:**
1. Go to: https://github.com/martinkozojed/kitloop-gear-hub/pulls
2. Click: "New pull request"
3. Base: `main` ← Compare: `test/ci-block`
4. Create pull request

#### 5. Expected Results

**CI Check:**
```
⏳ release-gate — In progress (yellow)
   ↓
❌ release-gate — Failed (red)
   Linting failed: console.log violates no-console rule
```

**Merge Button:**
```
🔴 Merging is blocked

Required status check "release-gate" has not succeeded.

[Merge pull request] ← Button is DISABLED (grayed out)
```

**Admin Override:**
If you're admin and "Include administrators" is OFF:
```
⚠️  You can merge this even though checks failed
    (This is BAD - means "Include administrators" not enabled!)
```

If "Include administrators" is ON:
```
✅ Cannot merge - even as admin (GOOD!)
```

#### 6. Cleanup
```bash
# Close PR without merging
gh pr close test/ci-block --delete-branch

# Or via UI
# Click "Close pull request" → Delete branch
```

### ✅ PASS Criteria
- ✅ CI check runs and FAILS (red X)
- ✅ Merge button is DISABLED
- ✅ Even admin cannot merge (if "Include administrators" enabled)
- ✅ Error message clearly shows console.log violation

### ❌ FAIL Signs
- ❌ CI check passes (green checkmark) → console.log not caught
- ❌ Merge button is ENABLED despite failure → branch protection not working
- ❌ Can merge as admin → "Include administrators" not enabled

---

## ✅ TEST B: Doc-Only PR Skips CI (2 minutes)

### Purpose
Prove that documentation changes don't waste CI minutes.

### Steps

#### 1. Create Test Branch
```bash
git checkout main
git pull origin main
git checkout -b test/docs-only
```

#### 2. Change Documentation Only
```bash
# Edit README
echo "" >> README.md
echo "## Test Documentation Change" >> README.md

# Or edit any doc
echo "Test line" >> docs/OPERATIONS.md
```

**IMPORTANT:** Do NOT touch any files in CI paths:
- ❌ No changes in `src/`
- ❌ No changes in config files
- ✅ Only `docs/` or `.md` files

#### 3. Commit and Push
```bash
git add -A
git commit -m "docs: test that doc-only changes skip CI"
git push origin test/docs-only
```

#### 4. Open Pull Request
```bash
gh pr create \
  --title "TEST: Doc-only change (CI should skip)" \
  --body "This PR should not trigger release-gate workflow" \
  --base main \
  --head test/docs-only
```

#### 5. Expected Results

**CI Check:**
```
Option A (Best):
  No status checks appear
  
Option B (Also OK):
  ⏭️  release-gate — Skipped
     "All jobs and steps were skipped"

NOT Expected:
  ⏳ release-gate — In progress
  ✅ release-gate — Success
  (This means CI ran unnecessarily)
```

**Merge Button:**
```
✅ Ready to merge (green)

[Merge pull request] ← Button is ENABLED

Note: If branch protection requires status check,
      but CI didn't run, GitHub should allow merge
      for path-excluded changes.
```

#### 6. Optional: Merge This PR
```bash
# This is safe to merge (doc-only)
gh pr merge test/docs-only --squash --delete-branch
```

### ✅ PASS Criteria
- ✅ CI workflow does NOT run (or runs minimal checks only)
- ✅ Merge button is ENABLED (not blocked)
- ✅ Can merge without waiting for CI
- ✅ No wasted CI minutes

### ❌ FAIL Signs
- ❌ CI runs full suite (lint, type, build) → paths-ignore not working
- ❌ Merge blocked waiting for status check → branch protection misconfigured

---

## 📊 VERIFICATION MATRIX

| Test | What It Proves | Pass Criteria | Time |
|------|----------------|---------------|------|
| **A: CI Block** | Bad code cannot merge | ❌ CI fails → 🔴 Merge blocked | 3 min |
| **B: Doc Skip** | Doc changes don't waste CI | No CI run → ✅ Merge enabled | 2 min |

**Both PASS:** ✅ System is bulletproof  
**Any FAIL:** ❌ Fix configuration before production

---

## 🔧 TROUBLESHOOTING

### Test A: CI Passes (Should Fail)

**Problem:** console.log doesn't trigger failure

**Check:**
1. Is ESLint rule `no-console` enabled?
   ```bash
   grep -r "no-console" eslint.config.js
   ```

2. Did you add `// eslint-disable-line` comment?
   ```typescript
   console.log("test");  // ✅ Should fail
   console.log("test");  // eslint-disable-line  // ❌ Won't fail
   ```

**Fix:** Add console.log WITHOUT disable comment

---

### Test A: Can Merge Despite Failure

**Problem:** Merge button enabled even though CI failed

**Possible Causes:**

1. **Branch protection not enabled:**
   - Go to: Settings → Branches
   - Check: Rule exists for `main`

2. **Status check not required:**
   - Edit rule
   - Check: "Require status checks to pass" ✅
   - Check: "release-gate" is selected ✅

3. **Admin bypass enabled:**
   - Edit rule
   - Check: "Include administrators" ✅
   - Save

**Fix:** Review branch protection settings

---

### Test B: CI Runs Unnecessarily

**Problem:** Full CI suite runs for doc-only changes

**Check:**
```yaml
# .github/workflows/release-gate.yml
on:
  push:
    paths-ignore:
      - 'docs/**'    # ← Must be present
      - '**.md'      # ← Must be present
  pull_request:
    paths-ignore:
      - 'docs/**'    # ← Must be present
      - '**.md'      # ← Must be present
```

**If missing:** Add paths-ignore to both push and pull_request

**If present but still runs:**
- Check: Did you change BOTH docs AND code files?
- Solution: Only change doc files in test branch

---

## 📝 REPORTING RESULTS

### Pass Report Template
```markdown
## Branch Protection Verification - PASS ✅

**Date:** 2026-01-11
**Tested by:** [Your name]

### Test A: CI Block
- Branch: test/ci-block
- PR: #XXX
- CI Status: ❌ Failed (as expected)
- Merge Button: 🔴 Disabled (as expected)
- Admin Override: ✅ Blocked (as expected)
- **Result:** ✅ PASS

### Test B: Doc Skip
- Branch: test/docs-only
- PR: #XXX
- CI Status: ⏭️  Skipped (as expected)
- Merge Button: ✅ Enabled (as expected)
- **Result:** ✅ PASS

**Conclusion:** Branch protection is working correctly.
```

### Fail Report Template
```markdown
## Branch Protection Verification - FAIL ❌

**Date:** 2026-01-11
**Tested by:** [Your name]

### Test A: CI Block
- Branch: test/ci-block
- PR: #XXX
- Expected: CI fails, merge blocked
- Actual: [Describe what happened]
- **Result:** ❌ FAIL

**Issue:** [Describe the problem]
**Action:** [What needs to be fixed]
```

---

## 🎊 SUCCESS CRITERIA

**Both tests must pass for production readiness:**

✅ **Test A (CI Block):**
- console.log triggers lint failure
- CI shows red X
- Merge button disabled
- Even admin cannot bypass

✅ **Test B (Doc Skip):**
- Documentation change doesn't trigger CI
- Merge button enabled immediately
- No wasted CI minutes

**When both pass:**
🎉 **Branch protection is verified working**  
🚀 **System is production-ready**

---

## 🔗 RELATED DOCUMENTATION

- [Branch Protection Setup](GITHUB_BRANCH_PROTECTION.md) - How to configure
- [Release Gate Checklist](RELEASE_GATE_CHECKLIST.md) - What CI checks
- [Operations Guide](OPERATIONS.md) - Full workflow

---

**Last Updated:** 2026-01-11  
**Test Time:** 5 minutes total  
**Frequency:** Once after setup, then after major CI changes
