# Request Link hardening – E2E scenarios

Minimal smoke scenarios to verify the Request Link flow after hardening:

1. **Create request → provider sees it → Create reservation → refresh on /new → still prefilled → convert → request disappears**
   - Submit a request via public `/request/:token` (token from provider Settings after generate).
   - Log in as provider, open Reservations → Poptávky tab; confirm the request appears.
   - Click "Vytvořit rezervaci" (navigates to `/provider/reservations/new?fromRequest=<id>`).
   - Refresh the page; form should remain prefilled (resolve from URL).
   - Fill variant and submit; convert RPC runs; redirect to reservations; request no longer in Poptávky.

2. **Double convert**
   - From a pending request, open `/provider/reservations/new?fromRequest=<id>` in two tabs.
   - Submit in tab 1 (success).
   - Submit in tab 2; RPC is idempotent and returns same reservation_id; no duplicate reservation.

3. **Reject with concurrency guard**
   - Two tabs on Poptávky; reject the same request in both.
   - First reject: 1 row updated, toast "Request rejected", row removed.
   - Second reject: 0 rows updated, toast "This request has already been processed", list refreshed.

4. **Token hygiene**
   - Provider Settings: Generate link → URL shown once; copy; refresh page → "Link is active" (no URL); Regenerate → new URL shown once.

SQL verification: run `docs/verification/request_link_hardening_verify.sql` after migrations.
