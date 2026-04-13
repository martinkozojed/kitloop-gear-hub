DO $$
DECLARE pol record;
BEGIN FOR pol IN
SELECT policyname
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'providers' LOOP EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.providers';
END LOOP;
END $$;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
-- 1. Public/Anon: View approved only
CREATE POLICY "Public view approved" ON public.providers FOR
SELECT TO anon,
    authenticated USING (status = 'approved');
-- 2. Owner: View own
CREATE POLICY "Owner view own" ON public.providers FOR
SELECT TO authenticated USING (auth.uid() = user_id);
-- 3. Owner: Update own
CREATE POLICY "Owner update own" ON public.providers FOR
UPDATE TO authenticated USING (auth.uid() = user_id);
-- 4. Owner: Insert own
CREATE POLICY "Owner insert own" ON public.providers FOR
INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- 5. Service Role: Full Access (Explicit, though usually bypassed, good for clarity)
CREATE POLICY "Service Role Full Access" ON public.providers TO service_role USING (true) WITH CHECK (true);