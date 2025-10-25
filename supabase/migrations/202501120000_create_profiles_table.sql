-- Vytvoří tabulku public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz,
    username text UNIQUE,
    full_name text,
    avatar_url text,
    website text,
    role text NOT NULL DEFAULT 'customer',

    CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Nastaví RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone."
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own profile."
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile."
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger pro 'updated_at'
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;
CREATE TRIGGER handle_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION extensions.moddatetime (updated_at);
