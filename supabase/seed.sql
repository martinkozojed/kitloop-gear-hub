SELECT '--- Active INSERT policies on user_provider_memberships ---';
SELECT policyname FROM pg_policies WHERE tablename = 'user_provider_memberships' AND cmd = 'INSERT';

SELECT '--- RLS status for user_provider_memberships ---';
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'user_provider_memberships';
