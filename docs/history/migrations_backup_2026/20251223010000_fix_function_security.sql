-- Fix security warning: "Function `public.update_updated_at_column` has a role mutable search_path"
-- Explicitly setting search_path prevents malicious code execution via search path manipulation.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
