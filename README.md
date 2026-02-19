
# Kitloop - Outdoor Gear Rental Platform

Kitloop is a peer-to-peer marketplace for outdoor gear rentals, connecting adventure enthusiasts with local gear providers. The platform enables users to browse available equipment, make reservations, and list their own gear for others to rent.

## What this project does

- **Browse outdoor gear** - Search and filter by location, category, dates
- **List your gear** - Generate income by renting out your outdoor equipment
- **Make reservations** - Book gear for your next adventure
- **Community features** - Reviews, ratings, and messaging between renters and providers

## Tech Stack

This project is built with:

- **Vite** - Fast build tool and development server
- **TypeScript** - Static typing for better developer experience
- **React** - UI component library
- **React Router** - Navigation and routing
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality UI components
- **Lucide React** - Beautiful, consistent icons
- **React Hook Form** - Form validation and handling
- **React Query** - Data fetching library

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd kitloop

# Install dependencies
npm install
# or
yarn install

# Start the development server
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:5173`

### Environment Variables

Create a `.env.local` file based on the provided `.env.example` and add your
Supabase credentials:

```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Build metadata & feature flags

- Build stamp (release gate): `VITE_COMMIT_SHA` and `VITE_BUILD_TIME` **must** be set for staging/prod; “unknown” values are considered a sanity-check failure. Example for GitHub Actions:  
  `VITE_COMMIT_SHA=$(git rev-parse HEAD)` and `VITE_BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)` before `npm run build`.  
  Set these as environment variables in your deploy provider (e.g., Netlify/Vercel UI or GitHub Actions env/vars) for non-dev builds.
  - Netlify example (netlify.toml): `command = "VITE_COMMIT_SHA=${COMMIT_REF:-unknown} VITE_BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ) npm run build"`
- Demo content: `VITE_ENABLE_DEMO` controls demo routes and data generators (`false` for production).
- Mock notifications: use a single flag name `ENABLE_MOCK_NOTIFICATIONS` for services and expose it to the frontend as `VITE_ENABLE_MOCK_NOTIFICATIONS` (set to `true` only in dev/staging when you explicitly want mock notification calls).

### Playwright E2E smoke tests

Prerequisites:
- Install browsers once: `npx playwright install --with-deps chromium`
- Required env vars:
  - `E2E_BASE_URL` (staging URL; defaults to http://localhost:5173)
  - `E2E_SUPABASE_URL` (Supabase project URL for calling edge functions)
  - `E2E_PROVIDER_EMAIL` / `E2E_PROVIDER_PASSWORD`
  - `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`
  - `E2E_PENDING_PROVIDER_EMAIL` / `E2E_PENDING_PROVIDER_PASSWORD` (for approval flow)
  - `E2E_SEED_TOKEN` (shared secret for staging-only e2e_harness function)

Run locally:
```bash
npm run test:e2e
# Headed/debug
npm run test:e2e:headed -- --project=chromium --debug
```

### Deno functions & lockfile
- Canonical lock update: `deno task lock` (regenerates `deno.lock` for Supabase functions/scripts).
- CI uses `deno task deno:cache` with `--frozen`; run the lock task after dependency bumps and commit the updated `deno.lock` to keep `test_deno` green.
- More detail: `docs/deno-lock.md`.

### Deno functions & lockfile
- Canonical lock update: `deno task lock` (regenerates `deno.lock` for Supabase functions/scripts).
- CI uses `deno task deno:cache` with `--frozen`; run the lock task after dependency bumps and commit the updated `deno.lock` to keep `test_deno` green.
- More detail: `docs/deno-lock.md`.

### Admin Audit Log UI (PR3)
- Route: `/admin/audit` (admin-only).
- Data source: `admin_audit_logs` (RLS ensures only admins can read).
- Filters: time presets (24h/7d/all), action, actor (admin_id), provider/target id; pagination via “Load more”.
- Click a row to expand and see metadata JSON.

## Project Structure

```
/src
  /components       # Reusable UI components
    /home           # Homepage-specific components
    /layout         # Layout components (navbar, footer)
    /ui             # Base UI components from shadcn
  /pages            # Main application pages
  /services         # API service layer
  /lib              # Utility functions and helpers
  /hooks            # Custom React hooks
```

## Available Routes

- `/` - Homepage
- `/browse` - Browse available gear
- `/add-rental` - List your gear for rent
- `/login` - User login
- `/signup` - User registration
- `/how-it-works` - Information about the platform

## MVP / Onboarding

**SSOT:** [`docs/ssot/MVP_SCOPE.md`](docs/ssot/MVP_SCOPE.md) — the canonical scope document. Any work must align with it before shipping.

## Next Steps

- Integration with backend services
- User authentication system
- Reservation management
- Payment processing
- Messaging between users

## URL

**Project URL**: https://lovable.dev/projects/48794c70-a7f2-4e1f-877e-585e76831c05
