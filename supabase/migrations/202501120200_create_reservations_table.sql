-- Vytvoří tabulku public.reservations
CREATE TABLE IF NOT EXISTS public.reservations (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    
    provider_id uuid NOT NULL REFERENCES public.providers(id),
    user_id uuid NOT NULL REFERENCES public.profiles(user_id),
    
    gear_id uuid NOT NULL, 
    
    status text DEFAULT 'pending',

    start_date timestamptz NOT NULL,
    end_date timestamptz NOT NULL,
    
    CONSTRAINT reservations_dates_check CHECK (start_date < end_date)
);

-- Povolíme RLS
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Uživatelé vidí své rezervace."
ON public.reservations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Uživatelé mohou vytvářet své rezervace."
ON public.reservations FOR INSERT
WITH CHECK (auth.uid() = user_id);
