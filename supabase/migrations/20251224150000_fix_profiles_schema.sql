
-- Fix missing updated_at column in profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
