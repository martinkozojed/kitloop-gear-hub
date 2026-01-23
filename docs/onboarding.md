# Provider Onboarding System

## Overview

The provider onboarding system guides new rental shop owners through initial setup with a 3-step blocking wizard followed by a non-blocking dashboard checklist.

**Goal**: Provider creates first reservation within 15 minutes.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ONBOARDING SYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │  WIZARD (3 steps) │───▶│  CHECKLIST       │                  │
│  │  /provider/setup  │    │  Dashboard widget │                  │
│  └──────────────────┘    └──────────────────┘                  │
│         │                         │                             │
│         ▼                         ▼                             │
│  ┌──────────────────────────────────────────┐                  │
│  │         ONBOARDING PROGRESS TABLE         │                  │
│  │  (tracks step completion + timestamps)    │                  │
│  └──────────────────────────────────────────┘                  │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────────────────────────────┐                  │
│  │            TELEMETRY EVENTS               │                  │
│  │  onboarding.* for funnel analytics        │                  │
│  └──────────────────────────────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Wizard Steps

### Step 1: Workspace

Basic rental business information.

| Field | Required | Validation |
|-------|----------|------------|
| `rental_name` | ✅ | Min 3 chars, max 100 |
| `contact_phone` | ✅ | Phone regex |
| `contact_email` | ✅ | Email format |
| `currency` | Default: CZK | CZK/EUR/USD |
| `time_zone` | Default: Europe/Prague | Timezone list |

### Step 2: Location

Pickup location and business hours.

| Field | Required | Validation |
|-------|----------|------------|
| `location` (city) | ✅ | Min 2 chars |
| `address` | Optional | Max 200 chars |
| `business_hours_display` | Optional | Max 50 chars (e.g., "Po-Pá 9-17") |
| `pickup_instructions` | Optional | Max 500 chars |

### Step 3: Inventory Choice

Provider chooses how to add first inventory:

1. **CSV Import** → Redirects to `/provider/inventory?import=true`
2. **Manual Add** → Redirects to `/provider/inventory?addAsset=true`
3. **Demo Data** → Redirects to `/provider/dashboard`

---

## Dashboard Checklist

After completing the wizard, a checklist widget appears on the dashboard:

| Item | Required | Link |
|------|----------|------|
| Workspace configured | ✅ | - (auto-completed) |
| Location set up | ✅ | - (auto-completed) |
| First item added | ✅ | `/provider/inventory` |
| Create first reservation | ✅ | `/provider/reservations/new` |
| Set rental terms | Optional | `/provider/settings` |
| Invite team member | Optional | `/provider/settings#team` |

**Features:**

- Progress bar (X/6 completed)
- Dismiss button (persisted to DB)
- Confetti animation on 100% completion

---

## Database Schema

### `onboarding_progress` table

```sql
CREATE TABLE public.onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    
    -- Step completion timestamps
    step_workspace_completed_at TIMESTAMPTZ,
    step_location_completed_at TIMESTAMPTZ,
    step_inventory_completed_at TIMESTAMPTZ,
    step_first_reservation_at TIMESTAMPTZ,
    
    -- Checklist items (non-blocking)
    checklist_terms_configured BOOLEAN DEFAULT FALSE,
    checklist_team_invited BOOLEAN DEFAULT FALSE,
    
    -- Dismissal
    checklist_dismissed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_provider_progress UNIQUE (provider_id)
);
```

**RLS Policy**: Provider members can only access their own progress.

---

## Telemetry Events

| Event | Trigger | Props |
|-------|---------|-------|
| `onboarding.started` | Wizard mount | `step: 1` |
| `onboarding.workspace_completed` | Step 1 submit | `currency`, `timezone` |
| `onboarding.location_completed` | Step 2 submit | `has_hours`, `has_instructions` |
| `onboarding.inventory_completed` | Step 3 choice | `path` |
| `onboarding.first_reservation` | First reservation | - |
| `onboarding.checklist_dismissed` | Checklist dismissed | - |
| `onboarding.completed` | Checklist 100% | - |

---

## File Structure

```
src/
├── pages/provider/
│   └── ProviderSetup.tsx        # 3-step wizard
├── components/
│   ├── dashboard/
│   │   └── OnboardingChecklist.tsx  # Dashboard widget
│   └── onboarding/
│       └── QuickAddAsset.tsx    # Simplified asset form
├── lib/
│   ├── schemas/
│   │   └── onboarding.ts        # Zod validation
│   └── telemetry.ts             # Events
└── locales/
    ├── cs.json                  # Czech translations
    └── en.json                  # English translations
```

---

## i18n Keys

All onboarding strings are under the `onboarding` namespace:

- `onboarding.wizard.*` - Wizard titles, labels, placeholders, buttons
- `onboarding.checklist.*` - Checklist title, items, progress

---

## Testing

### Manual Smoke Test

1. **Fresh signup** → `/provider/setup` renders
2. **Step 1**: Fill workspace → telemetry `workspace_completed`
3. **Step 2**: Fill location → telemetry `location_completed`
4. **Step 3**: Choose path → redirect to correct page
5. **Dashboard**: Checklist widget visible, 2-3/6 completed
6. **Add inventory** → checklist updates
7. **Create reservation** → checklist updates
8. **Dismiss checklist** → hidden, DB updated
9. **Re-login** → checklist stays hidden

### Telemetry Verification

```javascript
// In browser console
telemetry.logEventSummary()
// Should show: onboarding.started, workspace_completed, etc.
```

---

## Future Improvements

- [ ] A/B test different inventory paths
- [ ] Video tutorials embedded in wizard
- [ ] AI-assisted product description generation
- [ ] Integration with CSV templates
