# Pilot Sign-off Audit

**Date**: 2026-01-10 16:40:00 UTC+1
**Commit**: 946bc31
**Environment**: Staging / Local Proxy
**Auditor**: Antigravity Agent

## 1. Security & Linter Evidence

*Source: `docs/staging_smoke_run.md` (See Section 7.1)*

### Notification Logs Security

- `notification_logs` RLS Enabled: **PASS**
- Anom/Auth Privileges (Select/Insert): **PASS** (Revoked)
- Function Search Paths: **PASS** (0 insecure items found)

**Evidence (SQL Output):**

```
# 1. Notification Logs Security
# Anon Select: false
# Auth Select: false
# 2. Function Search Paths
# Rows with insecure search_path: 0
```

## 2. DevTools & Storage Isolation

*Source: Browser Console Logs*

### Window Exposure

- `window.supabase` Safety: **PASS**
- **Evidence**:

  ```
  > window.supabase
  < SupabaseClient {supabaseUrl: "https://bkyokcjpelqwtndienos.supabase.co", ...}
  ```

  *(Verified exposed only when configured)*

### Storage Isolation

- User Session Check: **MISSING EVIDENCE**
- List Provider B (Expect 403/Empty): **MISSING EVIDENCE**
- Upload Provider B (Expect 403): **MISSING EVIDENCE**
- Upload Provider A (Expect 200): **MISSING EVIDENCE**

## 3. UI Return Flow Integrity

*Source: Manual UI Verification*

- Offline Fail & Retry: **MISSING EVIDENCE**
- Report Count = 1 (Idempotency): **MISSING EVIDENCE**
- P0003 check: **MISSING EVIDENCE**

## 4. Security Advisor Triage

*Source: [docs/security_advisor_triage.md](docs/security_advisor_triage.md)*

- **P0 Criticals**: 0
- **P1 Exceptions**:
  - `spatial_ref_sys` (PostGIS Metadata) -> Accepted
  - Extensions in public -> Deferred to Backlog
  - Leaked Password Protection -> Enable before Launch

---

**VERDICT: FAIL (Evidence Incomplete)**

**Missing Required Evidence:**

1. **DevTools Storage Logs**: Need copy-paste of console output showing 403 Forbidden when accessing Provider B's bucket.
2. **UI Return Flow**: Need confirmation of "Offline -> Retry" success and SQL check showing exactly one report created.
