-- Vytvoří tabulku public.providers
CREATE TABLE IF NOT EXISTS public.providers (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    name text NOT NULL CHECK (char_length(name) > 3),
    contact_name text,
    email text,
    phone text,
    status text,
    user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    verified boolean DEFAULT false
);

-- Povolíme RLS.
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public providers are viewable by everyone."
ON public.providers FOR SELECT
USING (true);

CREATE POLICY "Owners can manage their own provider."
ON public.providers FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
