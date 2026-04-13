-- Migration: Advanced Trust Scoring
-- 1. Rename/Expand Enum (Need to drop old one or alter it carefully)
-- Or just add new statuses to existing enum if possible, or create a separate 'trust_score' INT.
-- Let's stick to the Enum but expand it.
-- Current: 'safe', 'warning', 'blacklist'
-- New: 'trusted', 'verified'

ALTER TYPE customer_risk_status ADD VALUE IF NOT EXISTS 'trusted';
ALTER TYPE customer_risk_status ADD VALUE IF NOT EXISTS 'verified';

-- 2. Add Automation Trigger
-- When a reservation is marked 'completed' (returned without damage), increment a counter or check history.
-- Actually cheaper: Calculate on the fly in `get_customer_360` OR use a simple counter on `customers` table.
-- Let's add `lifetime_value_cents` and `completed_rentals_count` to customers for easy logic.

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS lifetime_value_cents BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_rentals_count INT DEFAULT 0;

-- 3. Trigger to update counters
CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE public.customers
        SET 
            completed_rentals_count = completed_rentals_count + 1,
            lifetime_value_cents = lifetime_value_cents + NEW.amount_total_cents
        WHERE id = NEW.crm_customer_id;
        
        -- Auto-promote to TRUSTED if > 3 rentals
        UPDATE public.customers
        SET risk_status = 'trusted'
        WHERE id = NEW.crm_customer_id 
          AND completed_rentals_count >= 3 
          AND risk_status = 'safe'; -- Only promote if currently neutral/safe
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_trust
AFTER UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_stats();
