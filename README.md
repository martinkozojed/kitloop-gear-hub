
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
- Demo content: `VITE_ENABLE_DEMO` controls demo routes and data generators (`false` for production).
- Mock notifications: use a single flag name `ENABLE_MOCK_NOTIFICATIONS` for services and expose it to the frontend as `VITE_ENABLE_MOCK_NOTIFICATIONS` (set to `true` only in dev/staging when you explicitly want mock notification calls).

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

## Next Steps

- Integration with backend services
- User authentication system
- Reservation management
- Payment processing
- Messaging between users

## URL

**Project URL**: https://lovable.dev/projects/48794c70-a7f2-4e1f-877e-585e76831c05
