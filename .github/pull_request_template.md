# Pull Request Checklist

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
