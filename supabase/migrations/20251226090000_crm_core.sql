-- CRM Core Schema Migration

-- 1. Accounts (B2B / Organizations)
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tax_id TEXT, -- ICO/VAT
    billing_address JSONB,
    contact_email TEXT,
    contact_phone TEXT,
    status TEXT DEFAULT 'active', -- active, archived, blocked
    risk_score INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Customers (Operational CRM Profiles)
-- This table is the "Single Source of Truth" for operational data (sizes, timeline).
-- It can link to an auth.user (if registered) or be standalone (walk-in).
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    
    -- Optional link to App User (if they have a login)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- B2B / Organizational Link
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    is_contact_person BOOLEAN DEFAULT false,
    
    -- Core Identity (Mutable for Walk-ins, Synced for Users)
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    
    -- CRM Attributes
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    status TEXT DEFAULT 'active', -- active, vip, risk, archived
    
    -- Operational Data (Sensitive - protected by RLS)
    preferences JSONB DEFAULT '{}', -- { "shoe_size": 42, "height_cm": 180, "skill": "expert" }
    consents JSONB DEFAULT '[]', -- [{ "type": "marketing", "value": true, "ts": "2025-..." }]
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Customer Events (Immutable Timeline)
CREATE TABLE IF NOT EXISTS public.customer_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    
    type TEXT NOT NULL, -- reservation, message, damage, review, note, status_change
    title TEXT NOT NULL, -- Short summary
    data JSONB, -- Context (reservation_id, damage_photo_url, etc.)
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_events ENABLE ROW LEVEL SECURITY;

-- 5. Create Indexes
CREATE INDEX IF NOT EXISTS idx_customers_provider_email ON public.customers(provider_id, email);
CREATE INDEX IF NOT EXISTS idx_customers_provider_phone ON public.customers(provider_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_account ON public.customers(account_id);
CREATE INDEX IF NOT EXISTS idx_events_customer ON public.customer_events(customer_id);

-- 6. RLS Policies
-- Providers can only see their own CRM data
CREATE POLICY "Providers can view own accounts" ON public.accounts
    FOR SELECT USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

CREATE POLICY "Providers can manage own accounts" ON public.accounts
    FOR ALL USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

CREATE POLICY "Providers can view own customers" ON public.customers
    FOR SELECT USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

CREATE POLICY "Providers can manage own customers" ON public.customers
    FOR ALL USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

CREATE POLICY "Providers can view events" ON public.customer_events
    FOR SELECT USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

CREATE POLICY "Providers can insert events" ON public.customer_events
    FOR INSERT WITH CHECK (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

-- 7. Add Trigger for Updated At
CREATE TRIGGER handle_updated_at_accounts BEFORE UPDATE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE TRIGGER handle_updated_at_customers BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
