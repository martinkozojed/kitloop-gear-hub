-- Add rental_name column to providers table (if not exists)
ALTER TABLE public.providers
ADD COLUMN IF NOT EXISTS rental_name text NOT NULL DEFAULT 'Kitloop Admin Provider';

-- Ensure existing rows have rental_name set (optional)
UPDATE public.providers
SET rental_name = name
WHERE rental_name IS NULL;
