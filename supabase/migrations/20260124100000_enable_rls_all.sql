-- Enable RLS on reservation_lines
ALTER TABLE public.reservation_lines ENABLE ROW LEVEL SECURITY;
-- Policy: Lines are visible if the parent reservation is visible
CREATE POLICY "Lines visible via reservation" ON public.reservation_lines FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.reservations r
        WHERE r.id = reservation_lines.reservation_id
    )
);