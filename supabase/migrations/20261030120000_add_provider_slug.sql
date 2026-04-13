-- Migration: Add slug column to providers for SEO-friendly public profile URLs (/p/:slug)
-- Auto-generates slugs from rental_name with Czech diacritics transliteration

-- 1. Add slug column (nullable, will be backfilled)
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Unique partial index (only non-deleted providers)
CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_slug
  ON public.providers (slug)
  WHERE deleted_at IS NULL;

-- 3. Check constraint: lowercase a-z0-9 and hyphens, 3-60 chars, no leading/trailing hyphen
-- Constraint only fires when slug IS NOT NULL (standard SQL behavior for CHECK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_slug_format'
  ) THEN
    ALTER TABLE public.providers
      ADD CONSTRAINT chk_slug_format
      CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$');
  END IF;
END $$;

-- 4. Slug generation helper function (reusable by backfill + trigger)
CREATE OR REPLACE FUNCTION public.transliterate_czech(input TEXT)
RETURNS TEXT
LANGUAGE "plpgsql" IMMUTABLE
SET "search_path" TO 'public'
AS $$
DECLARE
  result TEXT;
BEGIN
  result := input;
  -- Czech diacritics -> ASCII
  result := replace(result, 'ě', 'e');
  result := replace(result, 'š', 's');
  result := replace(result, 'č', 'c');
  result := replace(result, 'ř', 'r');
  result := replace(result, 'ž', 'z');
  result := replace(result, 'ý', 'y');
  result := replace(result, 'á', 'a');
  result := replace(result, 'í', 'i');
  result := replace(result, 'é', 'e');
  result := replace(result, 'ú', 'u');
  result := replace(result, 'ů', 'u');
  result := replace(result, 'ď', 'd');
  result := replace(result, 'ť', 't');
  result := replace(result, 'ň', 'n');
  result := replace(result, 'ó', 'o');
  -- Uppercase variants
  result := replace(result, 'Ě', 'e');
  result := replace(result, 'Š', 's');
  result := replace(result, 'Č', 'c');
  result := replace(result, 'Ř', 'r');
  result := replace(result, 'Ž', 'z');
  result := replace(result, 'Ý', 'y');
  result := replace(result, 'Á', 'a');
  result := replace(result, 'Í', 'i');
  result := replace(result, 'É', 'e');
  result := replace(result, 'Ú', 'u');
  result := replace(result, 'Ů', 'u');
  result := replace(result, 'Ď', 'd');
  result := replace(result, 'Ť', 't');
  result := replace(result, 'Ň', 'n');
  result := replace(result, 'Ó', 'o');
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.slugify(input TEXT)
RETURNS TEXT
LANGUAGE "plpgsql" IMMUTABLE
SET "search_path" TO 'public'
AS $$
DECLARE
  result TEXT;
BEGIN
  -- Transliterate Czech chars
  result := public.transliterate_czech(input);
  -- Lowercase
  result := lower(result);
  -- Replace non-alphanumeric with hyphens
  result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
  -- Remove leading/trailing hyphens
  result := trim(BOTH '-' FROM result);
  -- Collapse multiple hyphens
  result := regexp_replace(result, '-{2,}', '-', 'g');
  -- Enforce min length 3: pad with trailing 0s if needed
  IF length(result) < 3 THEN
    result := rpad(result, 3, '0');
  END IF;
  -- Enforce max length 60
  result := left(result, 60);
  -- Trim trailing hyphen after truncation
  result := rtrim(result, '-');
  RETURN result;
END;
$$;

-- 5. Backfill function: generate slugs for all providers where slug IS NULL
CREATE OR REPLACE FUNCTION public.generate_provider_slugs()
RETURNS void
LANGUAGE "plpgsql"
SET "search_path" TO 'public'
AS $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  candidate TEXT;
  suffix INT;
BEGIN
  FOR rec IN
    SELECT id, rental_name
    FROM public.providers
    WHERE slug IS NULL
    ORDER BY created_at ASC NULLS LAST
  LOOP
    base_slug := public.slugify(rec.rental_name);
    candidate := base_slug;
    suffix := 2;

    -- Resolve collisions
    WHILE EXISTS (
      SELECT 1 FROM public.providers
      WHERE slug = candidate AND id != rec.id
    ) LOOP
      candidate := left(base_slug, 60 - length(suffix::text) - 1) || '-' || suffix::text;
      suffix := suffix + 1;
    END LOOP;

    UPDATE public.providers SET slug = candidate WHERE id = rec.id;
  END LOOP;
END;
$$;

-- Run backfill
SELECT public.generate_provider_slugs();

-- 6. Auto-slug trigger for new INSERTs
CREATE OR REPLACE FUNCTION public.auto_generate_slug()
RETURNS TRIGGER
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  suffix INT;
BEGIN
  base_slug := public.slugify(NEW.rental_name);
  candidate := base_slug;
  suffix := 2;

  WHILE EXISTS (
    SELECT 1 FROM public.providers
    WHERE slug = candidate AND id != NEW.id
  ) LOOP
    candidate := left(base_slug, 60 - length(suffix::text) - 1) || '-' || suffix::text;
    suffix := suffix + 1;
  END LOOP;

  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_providers_auto_slug ON public.providers;
CREATE TRIGGER trg_providers_auto_slug
  BEFORE INSERT ON public.providers
  FOR EACH ROW
  WHEN (NEW.slug IS NULL)
  EXECUTE FUNCTION public.auto_generate_slug();
