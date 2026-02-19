# Pull Request Checklist

## MVP Scope Alignment

- [ ] Aligned with [docs/ssot/MVP_SCOPE.md](../docs/ssot/MVP_SCOPE.md) sections: _(list section numbers, e.g. §2 Reservations, §5 Guardrails)_
- [ ] No scope expansion (or PR is titled `SCOPE CHANGE: ...` and SSOT updated)
- [ ] No new status strings introduced (see SSOT §2 Reservations — status table; requires `SCOPE CHANGE:` PR).
- [ ] No app-layer DML on `gear_items` introduced (see SSOT §2 Inventory — app-layer rule).
- [ ] If DB migration touches canonical tables/views, prod-parity check evidence included (per SSOT §5).
- [ ] Verification steps included in PR description
- [ ] typecheck / lint / build passed

## UI & Design System

- [ ] **No arbitrary values**: I have checked for `text-[..px]`, `shadow-[...]`, `rounded-[..px]`.
- [ ] **Tokens used**: I am using `text-xs/sm`, `shadow-card/hero`, `rounded-lg/xl` tokens.
- [ ] **Status Colors**: I am using `status-colors.ts` helpers or `status-*` tokens, NOT hardcoded colors.
- [ ] **Icons**: I am using `<Icon>` wrapper or standardized sizing (20px/md for nav, 16px/sm for buttons).
- [ ] **Marketing**: I am NOT using marketing-only tokens (hero-glow, shadow-hero) inside the dashboard app.

## Code Quality

- [ ] **Lint Colors**: I ran `npm run lint:colors` and it passed (no new violations).
- [ ] **Components**: I reused existing components (Card, Button, Badge) instead of building custom UI.

## Impact

- [ ] **Mobile Check**: I verified the layout on mobile/tablet.
- [ ] **Dark Mode**: (If applicable) I verified the changes in dark mode or ensured tokens support it.
