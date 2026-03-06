-- PR 3: Asset Condition DB & Return UI
-- Adds a separate health_state column to assets so that operational status (maintenance vs available)
-- is clearly decoupled from physical condition (repair vs cleaning).
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'asset_health_state'
) THEN CREATE TYPE public.asset_health_state AS ENUM ('ok', 'cleaning', 'repair', 'retired');
END IF;
END $$;
ALTER TABLE public.assets
ADD COLUMN IF NOT EXISTS health_state public.asset_health_state DEFAULT 'ok'::public.asset_health_state NOT NULL;
-- Backfill logic: If an asset was maintenance/retired, try to give it a sensible default if they use UI to change ops status without touching health
UPDATE public.assets
SET health_state = 'repair'
WHERE status = 'maintenance'
    AND health_state = 'ok';
UPDATE public.assets
SET health_state = 'retired'
WHERE status = 'retired'
    AND health_state = 'ok';
-- Update create_return_report to take health_state if needed, though for now we can just use process_return or direct update