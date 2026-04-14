-- Smart Inventory Import: Taxonomy + Import Pipeline Tables
-- Spec: docs/strategy/smart_inventory_import.md

--------------------------------------------------------------------------------
-- 1. GEAR CATEGORIES (Kitloop Taxonomy v0)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gear_categories (
  id TEXT PRIMARY KEY,                          -- e.g. 'climbing/helmet/generic'
  activity_family TEXT NOT NULL,                 -- e.g. 'climbing'
  gear_category TEXT NOT NULL,                   -- e.g. 'helmet'
  subtype TEXT,                                  -- e.g. 'generic', 'kids', 'via-ferrata'
  display_name TEXT NOT NULL,                    -- e.g. 'Climbing Helmet'
  display_name_cs TEXT NOT NULL,                 -- e.g. 'Horolezecká helma'
  size_system TEXT NOT NULL DEFAULT 'one-size',  -- 'S/M/L', 'EU', 'length-cm', 'frame', etc.
  is_asset_trackable BOOLEAN NOT NULL DEFAULT true,
  requires_condition_tracking BOOLEAN NOT NULL DEFAULT false,
  requires_safety_notice BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.gear_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gear_categories_public_read" ON public.gear_categories
  FOR SELECT USING (true);

CREATE POLICY "gear_categories_admin_write" ON public.gear_categories
  FOR ALL USING (public.is_admin_trusted());

-- Index
CREATE INDEX idx_gear_categories_activity ON public.gear_categories(activity_family);

--------------------------------------------------------------------------------
-- SEED: Taxonomy v0 (~51 categories)
--------------------------------------------------------------------------------

INSERT INTO public.gear_categories (id, activity_family, gear_category, subtype, display_name, display_name_cs, size_system, is_asset_trackable, requires_condition_tracking, requires_safety_notice, sort_order) VALUES
-- CLIMBING (8)
('climbing/helmet/generic',      'climbing', 'helmet',       'generic',      'Climbing Helmet',          'Horolezecká helma',          'S/M/L',     true, true,  true,  100),
('climbing/helmet/kids',         'climbing', 'helmet',       'kids',         'Kids Climbing Helmet',     'Dětská horolezecká helma',   'S/M/L',     true, true,  true,  101),
('climbing/harness/generic',     'climbing', 'harness',      'generic',      'Climbing Harness',         'Sedací úvazek',              'XS-XL',     true, true,  true,  110),
('climbing/harness/via-ferrata', 'climbing', 'harness',      'via-ferrata',  'Via Ferrata Harness',      'Úvazek na via ferratu',      'XS-XL',     true, true,  true,  111),
('climbing/ferrata-set/generic', 'climbing', 'ferrata-set',  'generic',      'Via Ferrata Set',          'Ferratový set',              'one-size',  true, true,  true,  120),
('climbing/carabiner/locking',   'climbing', 'carabiner',    'locking',      'Locking Carabiner',        'Jistící karabina',           'one-size',  true, true,  true,  130),
('climbing/rope/single',         'climbing', 'rope',         'single',       'Single Rope',              'Jednoduché lano',            'length-m',  true, true,  true,  140),
('climbing/belay-device/generic','climbing', 'belay-device', 'generic',      'Belay Device',             'Jistítko',                   'one-size',  true, true,  true,  150),

-- WINTER (12)
('winter/skis/alpine',           'winter',   'skis',         'alpine',       'Alpine Skis',              'Sjezdové lyže',              'length-cm', true, true,  false, 200),
('winter/skis/cross-country',    'winter',   'skis',         'cross-country','Cross-Country Skis',       'Běžecké lyže',               'length-cm', true, true,  false, 201),
('winter/skis/touring',          'winter',   'skis',         'touring',      'Touring Skis',             'Skialpové lyže',             'length-cm', true, true,  false, 202),
('winter/snowboard/generic',     'winter',   'snowboard',    'generic',      'Snowboard',                'Snowboard',                  'length-cm', true, true,  false, 210),
('winter/boots/ski',             'winter',   'boots',        'ski',          'Ski Boots',                'Lyžařské boty',              'EU',        true, true,  false, 220),
('winter/boots/snowboard',       'winter',   'boots',        'snowboard',    'Snowboard Boots',          'Snowboardové boty',          'EU',        true, true,  false, 221),
('winter/boots/cross-country',   'winter',   'boots',        'cross-country','Cross-Country Boots',      'Běžecké boty',               'EU',        true, true,  false, 222),
('winter/poles/ski',             'winter',   'poles',        'ski',          'Ski Poles',                'Lyžařské hůlky',             'length-cm', true, false, false, 230),
('winter/poles/trekking',        'winter',   'poles',        'trekking',     'Trekking Poles',           'Trekové hůlky',              'length-cm', true, false, false, 231),
('winter/helmet/ski',            'winter',   'helmet',       'ski',          'Ski Helmet',               'Lyžařská helma',             'S/M/L',     true, true,  true,  240),
('winter/goggles/generic',       'winter',   'goggles',      'generic',      'Ski Goggles',              'Lyžařské brýle',             'one-size',  true, false, false, 250),
('winter/crampons/generic',      'winter',   'crampons',     'generic',      'Crampons',                 'Mačky',                      'EU-range',  true, true,  false, 260),

-- CYCLING (6)
('cycling/bike/mtb',             'cycling',  'bike',         'mtb',          'Mountain Bike',            'Horské kolo',                'frame',     true, true,  false, 300),
('cycling/bike/road',            'cycling',  'bike',         'road',         'Road Bike',                'Silniční kolo',              'frame',     true, true,  false, 301),
('cycling/bike/ebike',           'cycling',  'bike',         'ebike',        'E-Bike',                   'Elektrokolo',                'frame',     true, true,  false, 302),
('cycling/bike/kids',            'cycling',  'bike',         'kids',         'Kids Bike',                'Dětské kolo',                'wheel',     true, true,  false, 303),
('cycling/helmet/generic',       'cycling',  'helmet',       'generic',      'Cycling Helmet',           'Cyklistická helma',          'S/M/L',     true, true,  true,  310),
('cycling/child-seat/generic',   'cycling',  'child-seat',   'generic',      'Child Bike Seat',          'Dětská cyklosedačka',        'one-size',  true, true,  true,  320),

-- HIKING (4)
('hiking/backpack/daypack',      'hiking',   'backpack',     'daypack',      'Daypack',                  'Batoh na jednodenní výlet',  'liters',    true, false, false, 400),
('hiking/backpack/trekking',     'hiking',   'backpack',     'trekking',     'Trekking Backpack',        'Trekový batoh',              'liters',    true, false, false, 401),
('hiking/boots/trekking',        'hiking',   'boots',        'trekking',     'Trekking Boots',           'Trekové boty',               'EU',        true, true,  false, 410),
('hiking/poles/trekking',        'hiking',   'poles',        'trekking',     'Hiking Poles',             'Turistické hůlky',           'length-cm', true, false, false, 420),

-- CAMPING (10)
('camping/tent/2p',              'camping',  'tent',         '2p',           '2-Person Tent',            'Stan pro 2 osoby',           'capacity',  true, true,  false, 500),
('camping/tent/3-4p',            'camping',  'tent',         '3-4p',         '3-4 Person Tent',          'Stan pro 3–4 osoby',         'capacity',  true, true,  false, 501),
('camping/tent/family',          'camping',  'tent',         'family',       'Family Tent',              'Rodinný stan',               'capacity',  true, true,  false, 502),
('camping/sleeping-bag/summer',  'camping',  'sleeping-bag', 'summer',       'Summer Sleeping Bag',      'Letní spacák',               'S/M/L',     true, true,  false, 510),
('camping/sleeping-bag/3-season','camping',  'sleeping-bag', '3-season',     '3-Season Sleeping Bag',    'Třísezónní spacák',          'S/M/L',     true, true,  false, 511),
('camping/sleeping-bag/winter',  'camping',  'sleeping-bag', 'winter',       'Winter Sleeping Bag',      'Zimní spacák',               'S/M/L',     true, true,  false, 512),
('camping/mat/foam',             'camping',  'mat',          'foam',         'Foam Sleeping Mat',        'Pěnová karimatka',           'one-size',  true, false, false, 520),
('camping/mat/inflatable',       'camping',  'mat',          'inflatable',   'Inflatable Sleeping Mat',  'Nafukovací karimatka',       'S/M/L',     true, true,  false, 521),
('camping/stove/generic',        'camping',  'stove',        'generic',      'Camping Stove',            'Kempingový vařič',           'one-size',  true, false, false, 530),
('camping/headlamp/generic',     'camping',  'headlamp',     'generic',      'Headlamp',                 'Čelovka',                    'one-size',  true, false, false, 540),

-- WATER (6)
('water/kayak/generic',          'water',    'kayak',        'generic',      'Kayak',                    'Kajak',                      'length-m',  true, true,  false, 600),
('water/paddleboard/generic',    'water',    'paddleboard',  'generic',      'Stand-Up Paddleboard',     'Paddleboard',                'length-ft', true, true,  false, 610),
('water/paddle/kayak',           'water',    'paddle',       'kayak',        'Kayak Paddle',             'Kajakové pádlo',             'length-cm', true, false, false, 620),
('water/paddle/sup',             'water',    'paddle',       'sup',          'SUP Paddle',               'SUP pádlo',                  'length-cm', true, false, false, 621),
('water/lifejacket/generic',     'water',    'lifejacket',   'generic',      'Life Jacket',              'Záchranná vesta',            'S/M/L/XL',  true, true,  true,  630),
('water/wetsuit/generic',        'water',    'wetsuit',      'generic',      'Wetsuit',                  'Neopren',                    'S-XXL',     true, true,  false, 640),

-- ACCESSORIES (5)
('accessories/lock/generic',     'accessories', 'lock',       'generic',     'Lock',                     'Zámek',                      'one-size',  false, false, false, 700),
('accessories/rack/car',         'accessories', 'rack',       'car',         'Car Rack',                 'Střešní nosič',              'one-size',  true, false,  false, 710),
('accessories/bag/transport',    'accessories', 'bag',        'transport',   'Transport Bag',            'Přepravní vak',              'liters',    false, false, false, 720),
('accessories/repair-kit/generic','accessories','repair-kit', 'generic',     'Repair Kit',               'Sada na opravu',             'one-size',  false, false, false, 730),
('accessories/gps/generic',      'accessories', 'gps',        'generic',     'GPS Device',               'GPS zařízení',               'one-size',  true, true,  false, 740);


--------------------------------------------------------------------------------
-- 2. IMPORT PIPELINE TABLES
--------------------------------------------------------------------------------

-- Import Jobs
CREATE TABLE IF NOT EXISTS public.import_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.providers(id),
  status TEXT NOT NULL DEFAULT 'uploading'
    CHECK (status IN ('uploading', 'processing', 'resolving', 'publishing', 'completed', 'failed')),
  source_type TEXT NOT NULL CHECK (source_type IN ('csv', 'xlsx')),
  selected_sheet_name TEXT,
  total_rows INTEGER DEFAULT 0,
  ready_count INTEGER DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  published_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Import Files
CREATE TABLE IF NOT EXISTS public.import_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  import_job_id UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Import Rows (raw parsed data)
CREATE TABLE IF NOT EXISTS public.import_rows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  import_job_id UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  raw_payload JSON NOT NULL,
  raw_text_snapshot TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Normalized Inventory Drafts
CREATE TABLE IF NOT EXISTS public.normalized_inventory_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  import_job_id UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  import_row_id UUID NOT NULL REFERENCES public.import_rows(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'review'
    CHECK (status IN ('ready', 'review', 'skipped', 'published')),
  proposed_name TEXT,
  proposed_category_id TEXT REFERENCES public.gear_categories(id),
  proposed_quantity INTEGER,
  proposed_size TEXT,
  proposed_brand TEXT,
  proposed_price_per_day INTEGER,  -- cents
  proposed_notes TEXT,
  issue_codes TEXT[] DEFAULT '{}',
  explanation TEXT,
  group_key TEXT,
  user_confirmed_fields JSON,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Import Decisions (user bulk actions)
CREATE TABLE IF NOT EXISTS public.import_decisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  import_job_id UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  decision_type TEXT NOT NULL,
  applied_to_group_key TEXT,
  affected_draft_ids UUID[] DEFAULT '{}',
  payload JSON NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  reverted_at TIMESTAMPTZ
);

-- Provider Alias Rules (memory)
CREATE TABLE IF NOT EXISTS public.provider_alias_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.providers(id),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('category_alias', 'size_pattern', 'name_shortcut', 'column_mapping')),
  source_pattern TEXT NOT NULL,
  mapped_value TEXT NOT NULL,
  created_from_import_job_id UUID REFERENCES public.import_jobs(id),
  confidence TEXT DEFAULT 'confirmed' CHECK (confidence IN ('auto', 'confirmed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (provider_id, rule_type, source_pattern)
);

--------------------------------------------------------------------------------
-- 3. RLS POLICIES
--------------------------------------------------------------------------------

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.normalized_inventory_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_alias_rules ENABLE ROW LEVEL SECURITY;

-- import_jobs: direct provider_id
CREATE POLICY "import_jobs_provider" ON public.import_jobs
  FOR ALL USING (
    public.is_admin_trusted() OR
    public.check_is_member_safe(provider_id, auth.uid())
  );

-- import_files: join through import_job_id
CREATE POLICY "import_files_provider" ON public.import_files
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.import_jobs j
      WHERE j.id = import_job_id
      AND (public.is_admin_trusted() OR public.check_is_member_safe(j.provider_id, auth.uid())))
  );

-- import_rows: join through import_job_id
CREATE POLICY "import_rows_provider" ON public.import_rows
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.import_jobs j
      WHERE j.id = import_job_id
      AND (public.is_admin_trusted() OR public.check_is_member_safe(j.provider_id, auth.uid())))
  );

-- normalized_inventory_drafts: join through import_job_id
CREATE POLICY "normalized_drafts_provider" ON public.normalized_inventory_drafts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.import_jobs j
      WHERE j.id = import_job_id
      AND (public.is_admin_trusted() OR public.check_is_member_safe(j.provider_id, auth.uid())))
  );

-- import_decisions: join through import_job_id
CREATE POLICY "import_decisions_provider" ON public.import_decisions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.import_jobs j
      WHERE j.id = import_job_id
      AND (public.is_admin_trusted() OR public.check_is_member_safe(j.provider_id, auth.uid())))
  );

-- provider_alias_rules: direct provider_id
CREATE POLICY "alias_rules_provider" ON public.provider_alias_rules
  FOR ALL USING (
    public.is_admin_trusted() OR
    public.check_is_member_safe(provider_id, auth.uid())
  );

--------------------------------------------------------------------------------
-- 4. INDEXES
--------------------------------------------------------------------------------

CREATE INDEX idx_import_jobs_provider ON public.import_jobs(provider_id);
CREATE INDEX idx_import_jobs_status ON public.import_jobs(status);
CREATE INDEX idx_import_rows_job ON public.import_rows(import_job_id);
CREATE INDEX idx_drafts_job ON public.normalized_inventory_drafts(import_job_id);
CREATE INDEX idx_drafts_status ON public.normalized_inventory_drafts(status);
CREATE INDEX idx_drafts_group ON public.normalized_inventory_drafts(group_key);
CREATE INDEX idx_decisions_job ON public.import_decisions(import_job_id);
CREATE INDEX idx_alias_rules_provider ON public.provider_alias_rules(provider_id);
