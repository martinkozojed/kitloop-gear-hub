-- Fix handle_new_user trigger to match profiles table schema
-- Original was trying to insert into non-existent 'id' and 'email' columns
-- and ignoring the metadata role

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role;
  RETURN NEW;
END;
$$;
