-- Migration: Link Reservations to Operational CRM
-- 1. Add crm_customer_id to reservations
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS crm_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- 2. Index for performance
CREATE INDEX IF NOT EXISTS idx_reservations_crm_customer ON public.reservations(crm_customer_id);

-- 3. Backfill Logic (DO Block)
DO $$
DECLARE
    r RECORD;
    v_customer_id UUID;
BEGIN
    -- Iterate over reservations that don't have a linked CRM customer yet
    -- but have basic info (name/email) or a user_id
    FOR r IN 
        SELECT DISTINCT ON (provider_id, COALESCE(customer_email, user_id::text))
            id, provider_id, user_id, customer_email, customer_phone, customer_name
        FROM public.reservations
        WHERE crm_customer_id IS NULL
        AND (customer_email IS NOT NULL OR user_id IS NOT NULL)
    LOOP
        -- 1. Try to find existing CRM customer for this Provider + Email/User
        v_customer_id := NULL;
        
        -- Strategy A: By User ID (Strongest link)
        IF r.user_id IS NOT NULL THEN
            SELECT id INTO v_customer_id FROM public.customers 
            WHERE provider_id = r.provider_id AND user_id = r.user_id
            LIMIT 1;
        END IF;

        -- Strategy B: By Email (if not found by User ID)
        IF v_customer_id IS NULL AND r.customer_email IS NOT NULL THEN
            SELECT id INTO v_customer_id FROM public.customers 
            WHERE provider_id = r.provider_id AND lower(email) = lower(r.customer_email)
            LIMIT 1;
        END IF;

        -- 2. If not found, create new CRM Customer
        IF v_customer_id IS NULL THEN
            INSERT INTO public.customers (
                provider_id, 
                user_id, 
                full_name, 
                email, 
                phone,
                notes,
                tags
            ) VALUES (
                r.provider_id,
                r.user_id,
                COALESCE(r.customer_name, 'Unknown Customer'),
                r.customer_email,
                r.customer_phone,
                'Auto-created from historic reservation',
                '{Imported}'
            ) RETURNING id INTO v_customer_id;
        END IF;

        -- 3. Link ALL matching reservations for this user/email to this new Customer ID
        -- (Doing bulk update covers duplicates we skipped in the loop)
        IF r.user_id IS NOT NULL THEN
            UPDATE public.reservations 
            SET crm_customer_id = v_customer_id 
            WHERE provider_id = r.provider_id 
            AND user_id = r.user_id 
            AND crm_customer_id IS NULL;
        ELSIF r.customer_email IS NOT NULL THEN
             UPDATE public.reservations 
            SET crm_customer_id = v_customer_id 
            WHERE provider_id = r.provider_id 
            AND customer_email = r.customer_email 
            AND crm_customer_id IS NULL;       
        END IF;
        
    END LOOP;
END $$;
