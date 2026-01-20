-- Fix Staging Admin (provider@test.cz)

BEGIN;

DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Select the user used in .env.staging as ADMIN
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'provider@test.cz';
  
  IF v_admin_id IS NOT NULL THEN
    -- Ensure user_roles has entry
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_admin_id AND role = 'admin') THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (v_admin_id, 'admin');
    END IF;

    -- Update profiles
    UPDATE public.profiles 
    SET role = 'admin', is_admin = true 
    WHERE user_id = v_admin_id;
  END IF;
END $$;

COMMIT;
