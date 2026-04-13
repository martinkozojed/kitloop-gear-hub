-- Migration: Add Risk Profile to Customers
CREATE TYPE customer_risk_status AS ENUM ('safe', 'warning', 'blacklist');

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS risk_status customer_risk_status DEFAULT 'safe',
ADD COLUMN IF NOT EXISTS risk_notes TEXT;

-- Index for quick lookup during search/agenda load
CREATE INDEX IF NOT EXISTS idx_customers_risk_status ON public.customers(risk_status);
