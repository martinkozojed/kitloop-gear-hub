# Feature Flags - MVP Scope Control

## Overview

Feature flags control which parts of the application are visible to users. By default, production deployments show only **MVP-scope features** (Dashboard, Reservations, Inventory, Settings). Out-of-scope features can be enabled individually via environment variables.

---

## Available Flags

| Flag | Default (MVP) | Feature | Affects | Rollback Command |
|------|---------------|---------|---------|------------------|
| `VITE_ENABLE_ANALYTICS` | `false` | Provider Analytics Dashboard | Sidebar + `/provider/analytics` route | Set env var to `true` in Netlify |
| `VITE_ENABLE_CRM` | `false` | Customer Management (CRM) | Sidebar ("Customers") + `/provider/customers` route | Set env var to `true` in Netlify |
| `VITE_ENABLE_ACCOUNTS` | `false` | Accounts / Multi-Entity | Sidebar + `/provider/accounts` route | Set env var to `true` in Netlify |
| `VITE_ENABLE_MAINTENANCE` | `false` | Maintenance Tracking | Sidebar + `/provider/maintenance` route | Set env var to `true` in Netlify |
| `VITE_ENABLE_CALENDAR` | `false` | Calendar View | Sidebar + `/provider/calendar` route (if implemented) | Set env var to `true` in Netlify |
| `VITE_ENABLE_MARKETPLACE` | `false` | Public Marketplace | Public routes: `/browse`, `/add-rental` | Set env var to `true` in Netlify |

---

## Behavior When Disabled

When a feature flag is `false` (default):

**Navigation (Sidebar)**:

- Items for disabled features are **hidden** from the sidebar
- Only MVP features remain visible: Dashboard, Reservations, Inventory, Settings

**Routes**:

- **Provider routes** (`/provider/*`): Redirect to `/provider/dashboard` (NOT 404)
- **Public routes** (`/browse`, `/add-rental`): Redirect to `/` home page (NOT 404)
- Users attempting to access disabled features are **gracefully redirected** without error messages

---

## Local Development

### Enabling Features Locally

To test out-of-scope features during development:

1. Create `.env.local` in project root:

   ```bash
   # Enable specific features for local testing
   VITE_ENABLE_ANALYTICS=true
   VITE_ENABLE_CRM=true
   VITE_ENABLE_MARKETPLACE=true
   # ... other flags as needed
   ```

2. Restart dev server:

   ```bash
   npm run dev
   ```

3. Features will now be visible in sidebar and routes accessible

---

## Production Rollback / Re-enabling Features

### Netlify Environment Variables

To enable a feature in production (kitloop.cz):

1. Go to Netlify dashboard → Site settings → Environment variables
2. Find the relevant `VITE_ENABLE_*` variable
3. Change value from `false` to `true`
4. Trigger redeploy:

   ```bash
   # Option 1: Via Netlify UI - "Trigger deploy"
   # Option 2: Via git push (if merged to main)
   ```

5. Verify feature appears in production after deploy completes (~2min)

### Example: Re-enabling Analytics

```bash
# In Netlify Environment Variables:
VITE_ENABLE_ANALYTICS = true

# Trigger redeploy → Analytics sidebar item + route now accessible
```

---

## Testing Checklist

### MVP Mode (All Flags `false`)

- [ ] Sidebar shows ONLY: Dashboard, Reservations, Inventory, Settings
- [ ] Navigate to `/browse` → redirects to `/`
- [ ] Navigate to `/provider/analytics` → redirects to `/provider/dashboard`
- [ ] Navigate to `/provider/customers` → redirects to `/provider/dashboard`
- [ ] Navigate to `/provider/accounts` → redirects to `/provider/dashboard`
- [ ] Navigate to `/provider/maintenance` → redirects to `/provider/dashboard`
- [ ] No 404 errors - all redirects graceful

### Full Features Mode (All Flags `true`)

- [ ] Sidebar shows: Dashboard, Analytics, Reservations, Inventory, Maintenance, Customers, Accounts, Settings
- [ ] All routes accessible without redirects
- [ ] Marketplace routes (`/browse`, `/add-rental`) load correctly

---

## Important Notes

- **Admin routes**: NOT gated by feature flags - always visible to admin users
- **Backend tables/RPC**: NOT affected - database schema remains complete
- **Permissions**: Feature flags work ALONGSIDE existing permissions (e.g., `canViewFinancials` for Analytics)
- **No data deletion**: Disabling a feature only hides UI - data remains intact

---

## Troubleshooting

**Q: I changed a flag in Netlify but feature still hidden**

- Ensure you triggered a new deploy after changing env var
- Check build logs confirm new value: `VITE_ENABLE_* = true`
- Clear browser cache (Ctrl+F5)

**Q: Local .env.local not working**

- Restart dev server after creating/editing `.env.local`
- Verify flag value is exactly `true` (not `True`, `"true"`, etc.)
- Check no typos in flag name

**Q: Want to disable feature again**

- Set flag back to `false` in Netlify
- Trigger redeploy
- Feature will be hidden again after deploy
