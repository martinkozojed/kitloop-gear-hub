# PR7 Upload Hardening Notes

## Key file paths
- Shared validation: `shared/upload/validation.ts` (re-exported at `src/lib/upload/validation.ts`)
- Client helpers: `src/lib/upload/client.ts`
- Edge function: entry `supabase/functions/upload_ticket/index.ts`, core handler `supabase/functions/upload_ticket/handler.ts`

## Grep proof (no direct client uploads remain)
```
rg "storage\.from\(|\.upload\(|createSignedUploadUrl" -n src supabase
supabase/functions/upload_ticket/handler.ts:7:  createSignedUploadUrl: ...
supabase/functions/upload_ticket/handler.ts:235:    const signed = await deps.createSignedUploadUrl(rule!.bucket, path);
supabase/functions/upload_ticket/handler.test.ts:18:  createSignedUploadUrl: vi.fn().mockResolvedValue({
supabase/functions/upload_ticket/index.ts:79:    createSignedUploadUrl: async (bucket: string, path: string) => {
supabase/functions/upload_ticket/index.ts:83:        .createSignedUploadUrl(path, 15 * 60);
src/lib/upload/client.ts:68:  return supabase.storage.from(ticket.bucket).getPublicUrl(ticket.path).data.publicUrl;
```
All UI uploads route through `upload_ticket` + signed upload URLs; no `storage.from(...).upload(...)` calls remain.

## Storage policy impact
- Migration `supabase/migrations/20260112090000_upload_ticket_enforcement.sql` drops legacy insert policies for gear-images, damage-photos, and logos.
- New policy `service_upload_only` allows INSERT on those buckets **only** to `service_role`; direct client uploads outside the ticket flow are expected to be blocked.
- Signed uploads continue to work because `upload_ticket` signs URLs with the service role and storage honors the token (200/201 on successful upload; object created at `bucket/path`).

## Staging verification evidence
- Not executed in this environment (no staging credentials available). When running on staging, capture:
  - Upload HTTP status (200/201) + bucket/path.
  - Confirmation the object exists at that path.
  - One `audit_logs` row for `upload_ticket_issued` (IDs redacted are fine).
  - Optional: oversize denial + `upload_ticket_denied` audit row.
