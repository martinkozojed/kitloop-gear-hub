# CI Verification

This document serves as a minimal change to verify that GitHub branch protection rules are correctly configured and enforcing required status checks before allowing merges to `main`.

**Expected behavior**: This PR should be blocked from merging until all required CI checks (Smoke Tests workflow) pass successfully.

## Verification Test - 2026-02-16 19:24

This PR is specifically created to demonstrate and verify that:

1. Required checks (Smoke Tests) are enforced on PRs to main
2. Merge is blocked when required checks fail
3. Merge is allowed when required checks pass

**Test methodology**:

- Initial commit with valid code → checks should pass
- Deliberate TypeScript error → checks should fail, merge blocked
- Fix the error → checks should pass, merge allowed
