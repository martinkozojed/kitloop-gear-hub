## Admin Audit Log UI (PR3)

- **Route**: `/admin/audit` (admin-only via `AdminRoute` + RLS on `admin_audit_logs`).
- **Table used**: `public.admin_audit_logs` (RLS policy `admin_audit_logs_select_admin` restricts to admins).
- **Filters**: time range presets (24h, 7d, all), action dropdown (approve_provider/reject_provider/other), actor (admin_id), target/provider id, optional target_type filter.
- **Target type**: shown with each row/detail.
- **Pagination**: server-side `order by created_at desc`, limit 50 with “Load more”.
- **Detail**: click a row to expand and view metadata JSON, reason, actor/target IDs.
- **Run locally**: log in as admin and open `/admin/audit`; non-admins are blocked by RLS and route guard.
- **Where to find it**: sidebar Admin section (link “Audit log” visible only when `isAdmin=true`).

## Verification evidence
- Non-admin: fetching `admin_audit_logs` returns empty/blocked due to RLS (tested via Supabase client in browser DevTools; response empty array / 403 depending on session).
- Admin: rows visible with actions such as `upload_ticket_issued` and `approve_provider`; verified by loading `/admin/audit` and expanding a row to inspect metadata.
