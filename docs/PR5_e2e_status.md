E2E smoke exists, failing in CI; blocked on: 3 failing specs (admin approvals row visibility, provider login flow, upload file setup). Ref: d59dc9484c691edfa3cf9e6a3bb0e551af864e0d
Fail context:
- Spec/test: e2e/admin-approval.spec.ts — Admin approvals — step: expect row for pending provider toBeVisible (getByRole('row').filter({ hasText: <pending provider email> }))
  - Error: expect(locator).toBeVisible() failed; Timeout 15000ms, element not found
- Spec/test: e2e/reservation.spec.ts — provider can create reservation via UI — step: loginAs waitForLoadState / expect page URL to match provider dashboard/pending
  - Error: page.waitForLoadState timeout 120000ms; expect(page).toHaveURL(...) failed
- Spec/test: e2e/upload.spec.ts — image upload accepts real image and rejects spoofed file — step: prepare test files before upload
  - Error: ENOENT: no such file or directory, open '<outputDir>/valid.png'
- Artifacts: standard workflow uploads `playwright-report` and `playwright-traces` on failure (from e2e-smoke.yml)
