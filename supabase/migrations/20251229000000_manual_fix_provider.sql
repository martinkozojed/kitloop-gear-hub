-- Manually repair provider data for mvptestprovider@mail.com
DO $$
DECLARE
  v_user_id uuid;
  v_provider_id uuid;
BEGIN
  -- 1. Get User ID from auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'mvptestprovider@mail.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User mvptestprovider@mail.com not found in auth.users';
    RETURN;
  END IF;

  RAISE NOTICE 'Found User ID: %', v_user_id;

  -- 2. Ensure Profile exists and is set to 'provider'
  INSERT INTO public.profiles (user_id, role)
  VALUES (v_user_id, 'provider')
  ON CONFLICT (user_id) DO UPDATE
  SET role = 'provider';
  
  RAISE NOTICE 'Profile checked/updated';

  -- 3. Ensure Provider Record exists (find by email or create new)
  SELECT id INTO v_provider_id FROM public.providers WHERE email = 'mvptestprovider@mail.com';

  IF v_provider_id IS NULL THEN
    INSERT INTO public.providers (
        name, 
        rental_name, 
        status, 
        email, 
        contact_name, 
        phone,
        verified,
        onboarding_completed,
        onboarding_step
    )
    VALUES (
        'MVP Test Provider', 
        'MVP Rental', 
        'approved', 
        'mvptestprovider@mail.com', 
        'Admin', 
        '+420123456789',
        true,
        true,
        4
    )
    RETURNING id INTO v_provider_id;
    RAISE NOTICE 'Created new provider record: %', v_provider_id;
  ELSE
    -- Force update status to approved just in case
    UPDATE public.providers 
    SET status = 'approved',
        verified = true,
        onboarding_completed = true
    WHERE id = v_provider_id;
    RAISE NOTICE 'Updated existing provider record: %', v_provider_id;
  END IF;

  -- 4. Ensure Membership linkage
  INSERT INTO public.user_provider_memberships (user_id, provider_id, role)
  VALUES (v_user_id, v_provider_id, 'owner')
  ON CONFLICT (user_id, provider_id) DO UPDATE
  SET role = 'owner';

  RAISE NOTICE 'Membership linkage ensured';

END $$;
