-- Add performance indexes for critical queries
-- 1. Reservation Lines: FK Lookup
CREATE INDEX IF NOT EXISTS idx_reservation_lines_reservation_id ON public.reservation_lines(reservation_id);
-- 2. Reservations: Dashboard filtering (Provider + Date range)
-- Helps with "Upcoming" and "Active" queries on dashboard
CREATE INDEX IF NOT EXISTS idx_reservations_provider_start_date ON public.reservations(provider_id, start_date);
-- 3. Assets: Inventory filtering (Provider + Status)
-- Helps with inventory management queries
CREATE INDEX IF NOT EXISTS idx_assets_provider_status ON public.assets(provider_id, status);