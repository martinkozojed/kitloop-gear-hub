# Final Hardening PR & Ops Drill

This PR completes the backend and security hardening for the pilot gate before transitioning into page-only mode (UI) improvements.

**Scope enforced:**

- `submit_pilot_request`: if allowlist is set, missing/empty `Origin` returns `403` (secure default).
- `docs/verification/PR11_PR16_ACCEPTANCE_AND_VERIFICATION.md` is updated with “Production env verification + ops drill” and “PR#17 upgrade path”.
- Zero other backend, database, Auth, or RLS changes included in this branch.

## SSOT Alignment

| Action | SSOT Boundary / Goal |
|---|---|
| Enforce `Origin` header | Transparency & Security: pilot gate strictly guards who can request access. Dropping bad traffic early meets the security baseline for the Pilot phase. |
| Production verification & ops drill docs | Safe Release: No functional code is pushed to production without a documented, verified ops drill, keeping the provider-only MVP stable. |
| Restricting diff scope | "Page-only Mode" pre-requisite: Ensuring that the deployment baseline is rock solid before restricting the next iterations to purely frontend assets and copy. |

## Verification Plan

1. **Wait for Deploy Preview**
2. **Environment**: Set `ALLOWED_ORIGINS` to the preview URL and set a valid `RATE_LIMIT_SALT` (min 16 chars).
3. **Check A**: Send a `POST /submit_pilot_request` without an `Origin` header → Expect `403` and CORS error.
4. **Check B**: Send identical request WITH correct `Origin` → Expect `2xx` and correct CORS handling (`Access-Control-Allow-Origin` & `Vary: Origin`).
5. **Check C**: Simulate real user browser submission via `/signup` and verify it succeeds.
6. **Check D**: Read this documentation and confirm sections PR#17 and ops drill are present in `PR11_PR16_ACCEPTANCE_AND_VERIFICATION.md`.
