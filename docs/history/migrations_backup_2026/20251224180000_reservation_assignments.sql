
-- Create Reservation Assignments table to track specific assets for bookings

CREATE TABLE IF NOT EXISTS public.reservation_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()), -- Check-out Time
    returned_at TIMESTAMP WITH TIME ZONE, -- Check-in Time
    
    checked_out_by UUID REFERENCES auth.users(id),
    checked_in_by UUID REFERENCES auth.users(id),
    
    condition_out_score SMALLINT,
    condition_in_score SMALLINT,
    condition_note TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indexes
CREATE INDEX idx_reservation_assignments_reservation_id ON public.reservation_assignments(reservation_id);
CREATE INDEX idx_reservation_assignments_asset_id ON public.reservation_assignments(asset_id);
CREATE INDEX idx_reservation_assignments_active ON public.reservation_assignments(reservation_id) WHERE returned_at IS NULL;

-- RLS
ALTER TABLE public.reservation_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assignments: Provider Access" ON public.reservation_assignments
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.reservations r
        JOIN public.providers p ON r.provider_id = p.id
        WHERE r.id = reservation_assignments.reservation_id
        AND (
            p.id IN (SELECT provider_id FROM public.user_provider_memberships WHERE user_id = auth.uid())
            OR (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true
        )
    )
);

-- Allow Users to Read their OWN assignments (if they need to see what serial number they have)
CREATE POLICY "Assignments: Customer Read" ON public.reservation_assignments
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.reservations r
        WHERE r.id = reservation_assignments.reservation_id
        AND r.user_id = auth.uid()
    )
);
