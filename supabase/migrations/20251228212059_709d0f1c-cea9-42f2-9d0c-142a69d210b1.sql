-- ============================================================================
-- SECURITY FIX: Enable RLS on reservation_lines table
-- ============================================================================

-- 1. Enable RLS on reservation_lines
ALTER TABLE public.reservation_lines ENABLE ROW LEVEL SECURITY;

-- 2. Create policy for provider access (read/write)
CREATE POLICY "reservation_lines_provider_access"
ON public.reservation_lines
FOR ALL
USING (
  reservation_id IN (
    SELECT id FROM public.reservations 
    WHERE provider_id IN (
      SELECT provider_id FROM public.user_provider_memberships 
      WHERE user_id = auth.uid()
    )
  )
  OR public.is_admin()
)
WITH CHECK (
  reservation_id IN (
    SELECT id FROM public.reservations 
    WHERE provider_id IN (
      SELECT provider_id FROM public.user_provider_memberships 
      WHERE user_id = auth.uid()
    )
  )
  OR public.is_admin()
);

-- 3. Create policy for customers to view their own reservation lines
CREATE POLICY "reservation_lines_customer_read"
ON public.reservation_lines
FOR SELECT
USING (
  reservation_id IN (
    SELECT id FROM public.reservations 
    WHERE user_id = auth.uid()
  )
);