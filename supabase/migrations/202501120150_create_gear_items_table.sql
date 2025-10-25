-- Vytvoří tabulku public.gear_items
CREATE TABLE IF NOT EXISTS public.gear_items (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    
    provider_id uuid NOT NULL REFERENCES public.providers(id),
    
    name text NOT NULL,
    description text,
    brand text,
    model text,
    category text,
    quantity_available integer DEFAULT 0 CHECK (quantity_available >= 0),

    status text DEFAULT 'available',
    active boolean DEFAULT true,
    price_per_day integer
);

-- Povolíme RLS
ALTER TABLE public.gear_items ENABLE ROW LEVEL SECURITY;

-- Základní politiky
CREATE POLICY "Gear is publicly viewable."
ON public.gear_items FOR SELECT
USING (true);

CREATE POLICY "Provider members can manage gear."
ON public.gear_items FOR ALL
USING (auth.uid() = (SELECT user_id FROM public.providers WHERE id = provider_id))
WITH CHECK (auth.uid() = (SELECT user_id FROM public.providers WHERE id = provider_id));
