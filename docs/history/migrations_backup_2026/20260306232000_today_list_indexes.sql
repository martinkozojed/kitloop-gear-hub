-- Today List performance indexes for server-side triage queries.
-- Covers: pickups (provider_id + start_date + status),
--         returns/overdue (provider_id + end_date + status)
-- Pickups Today: WHERE provider_id = $1 AND status IN (...) AND start_date >= $2 AND start_date < $3
CREATE INDEX IF NOT EXISTS idx_reservations_provider_start_status ON public.reservations (provider_id, start_date, status);
-- Returns Today / Overdue: WHERE provider_id = $1 AND status = 'active' AND end_date >= $2 AND end_date < $3
CREATE INDEX IF NOT EXISTS idx_reservations_provider_end_status ON public.reservations (provider_id, end_date, status);