-- =====================================================================================
-- Migration: PR 5 - Pilot Metrics Dashboard View
-- Purpose: Expose high-level pilot traction metrics (Daily Active Reservations)
-- Author: Kitloop Foundation Audit
-- =====================================================================================
CREATE OR REPLACE VIEW public.vw_pilot_daily_metrics AS
SELECT r.provider_id,
    p.business_name,
    DATE(r.created_at) AS metric_date,
    COUNT(*) AS total_created_reservations,
    COUNT(*) FILTER (
        WHERE r.status = 'active'
    ) AS active_reservations,
    COUNT(*) FILTER (
        WHERE r.status = 'completed'
    ) AS completed_reservations,
    COUNT(*) FILTER (
        WHERE r.status = 'cancelled'
    ) AS cancelled_reservations
FROM public.reservations r
    JOIN public.providers p ON p.id = r.provider_id
GROUP BY r.provider_id,
    p.business_name,
    DATE(r.created_at);
-- RLS equivalent for Views: we GRANT access, but since it queries `reservations` and `providers`
-- underlying RLS on those tables applies *IF* we use security_invoker.
-- In Supabase/Postgres 15+, we can set security_invoker = true so the view 
-- observes the querying user's RLS.
ALTER VIEW public.vw_pilot_daily_metrics
SET (security_invoker = true);
-- Grants
GRANT SELECT ON public.vw_pilot_daily_metrics TO authenticated;
GRANT SELECT ON public.vw_pilot_daily_metrics TO service_role;