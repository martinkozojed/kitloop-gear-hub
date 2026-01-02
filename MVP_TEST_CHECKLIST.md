# MVP Manual Test Checklist

1) Onboarding & Auth
- Sign up as provider, complete `/provider/setup`, verify dashboard loads (pending status allowed).

2) Inventory
- Create product + variant, add at least one asset; verify asset appears in Inventory grid and status is `available`.

3) Reservation Creation
- Use `/provider/reservations/new`: pick the variant, enter dates in the future, save. Confirm reservation appears in list and agenda (status `hold`/payment `unpaid`).

4) Asset Assignment
- From dashboard agenda, open Issue dialog; auto-assignment should attach a free asset without conflicts.
- If no asset available, dialog shows a blocking message.

5) Issue Flow
- With payment unpaid, Issue is blocked. Update reservation payment_status to `paid`/`deposit_paid` (via admin/DB), reopen Issue: button enabled, contract printable, status changes to `active`.

6) Return Flow
- From agenda, open Return dialog: confirm return → reservation status `completed`, asset back to `available`. With “damage” checked, maintenance modal opens and logs entry.

7) CRM
- On Customers page, create customer via modal; verify appears in list and scoped to current provider. Accounts list filtered by provider.

8) Calendar
- Open calendar view: new reservation bar shows on correct variant row and date range; status filters work.

9) Routing/Focus
- `/marketplace` and `/my-reservations` redirect, navbar has no dead links.

10) Multi-tenant sanity
- Switching users/providers should show only their customers/accounts/reservations/assets (provider_id filters enforced).
