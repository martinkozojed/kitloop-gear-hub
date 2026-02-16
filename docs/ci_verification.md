# CI Verification

This document serves as a minimal change to verify that GitHub branch protection rules are correctly configured and enforcing required status checks before allowing merges to `main`.

**Expected behavior**: This PR should be blocked from merging until all required CI checks (Smoke Tests workflow) pass successfully.
