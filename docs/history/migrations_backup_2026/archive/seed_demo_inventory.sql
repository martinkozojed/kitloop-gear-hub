-- ============================================================================
-- DEMO SEED DATA FOR INVENTORY TESTING
-- ============================================================================
--
-- IMPORTANT: Before running this file, replace '378345f6-1912-4f68-94dd-90c23b685d66'
-- with your actual provider UUID from the database.
--
-- To find your provider_id, run:
-- SELECT id, business_name FROM public.providers WHERE user_id = auth.uid();
--
-- ============================================================================

-- Replace this with your actual provider_id
DO $$
DECLARE
  demo_provider_id UUID := '378345f6-1912-4f68-94dd-90c23b685d66'; -- ⚠️ CHANGE THIS!
BEGIN

-- Insert 10 realistic demo gear items
INSERT INTO public.gear_items (
  provider_id,
  name,
  category,
  description,
  price_per_day,
  quantity_total,
  quantity_available,
  condition,
  sku,
  location,
  notes,
  item_state,
  active,
  image_url
) VALUES
  -- 1. Ferrata Set
  (
    demo_provider_id,
    'Ferratový set Singing Rock Ferrata',
    'ferraty',
    'Kompletní set pro via ferratu včetně lana, brzdy a karabin. Vhodné pro začátečníky i pokročilé. Norma EN 958.',
    250,
    5,
    5,
    'good',
    'FS-001',
    'Sklad A - Horní patro',
    'Pravidelná kontrola každých 6 měsíců',
    'available',
    true,
    NULL
  ),

  -- 2. Climbing Helmet
  (
    demo_provider_id,
    'Horolezecká helma Petzl Boreo',
    'lezeni',
    'Lehká a pohodlná helma s certifikací EN 12492. Velikost: univerzální (53-61 cm).',
    80,
    10,
    8,
    'good',
    'HE-002',
    'Sklad A - Regál 3',
    '2 kusy v servisu do 15.11.2025',
    'available',
    true,
    NULL
  ),

  -- 3. Snowshoes
  (
    demo_provider_id,
    'Sněžnice MSR Evo Trail',
    'zimni',
    'All-terrain sněžnice s upínáním na boty. Nosnost do 90 kg. Délka 56 cm.',
    120,
    8,
    8,
    'new',
    'SN-003',
    'Sklad B - Zimní vybavení',
    'Nové, zakoupeno 09/2025',
    'available',
    true,
    NULL
  ),

  -- 4. Ski Touring Set
  (
    demo_provider_id,
    'Skialpinistický set Dynafit - lyže + pásy',
    'skialpinismus',
    'Kompletní set: skialpové lyže 170cm + stoupací pásy. Bez vázání.',
    450,
    3,
    2,
    'good',
    'SKI-004',
    'Sklad B - Sekce lyže',
    '1 ks rezervováno do 20.11.2025',
    'available',
    true,
    NULL
  ),

  -- 5. Camping Tent
  (
    demo_provider_id,
    'Stan MSR Hubba Hubba NX 2',
    'camping',
    'Dvouvrstvý stan pro 2 osoby. Hmotnost 1,72 kg. Snadné stavění, výborná ventilace.',
    200,
    6,
    6,
    'good',
    'TENT-005',
    'Sklad C - Kempy',
    'Poslední servis: 05/2025',
    'available',
    true,
    NULL
  ),

  -- 6. Mountain Bike
  (
    demo_provider_id,
    'Horské kolo Trek Marlin 7',
    'cyklo',
    'Hardtail MTB 29" kola, velikost rámu L. Brzdy Shimano hydraulické. Ideální pro trail a horské výlety.',
    350,
    4,
    3,
    'good',
    'BIKE-006',
    'Garáž - levá strana',
    '1 ks v servisu, návrat 18.11.2025',
    'available',
    true,
    NULL
  ),

  -- 7. Climbing Rope
  (
    demo_provider_id,
    'Lano Edelrid Tommy Caldwell 9.6mm 70m',
    'lezeni',
    'Dynamické lano na sportovní i tradiční lezení. Střední kategorie, velmi odolné.',
    150,
    3,
    3,
    'new',
    'ROPE-007',
    'Sklad A - Regál 1',
    'Nové v obalu',
    'available',
    true,
    NULL
  ),

  -- 8. Sleeping Bag
  (
    demo_provider_id,
    'Spacák Sea to Summit Spark SpI -5°C',
    'camping',
    'Prachový spacák s teplotou komfortu -5°C. Váha pouze 600g. Balitelný do malého objemu.',
    100,
    10,
    9,
    'good',
    'SLEEP-008',
    'Sklad C - Police 2',
    '1 ks v čištění',
    'available',
    true,
    NULL
  ),

  -- 9. Ice Axe
  (
    demo_provider_id,
    'Cepín Petzl Summit Evo',
    'zimni',
    'Klasický cepín délka 66 cm. Certifikace EN 13089. Vhodný pro vysokohorskou turistiku i ledovcovou túru.',
    70,
    7,
    7,
    'good',
    'ICE-009',
    'Sklad B - Zimní vybavení',
    'Pravidelně broušené hroty',
    'available',
    true,
    NULL
  ),

  -- 10. Climbing Harness
  (
    demo_provider_id,
    'Úvazek Black Diamond Momentum',
    'lezeni',
    'Univerzální sedací úvazek pro sportovní lezení i horolezectví. Velikost M.',
    60,
    12,
    10,
    'fair',
    'HAR-010',
    'Sklad A - Regál 3',
    '2 ks v servisu, starší kusy ale funkční',
    'available',
    true,
    NULL
  );

-- Success message
RAISE NOTICE '✅ Successfully inserted 10 demo gear items for provider: %', demo_provider_id;
RAISE NOTICE '📦 Items ready to test in inventory view!';

END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- After running this migration, verify the data with:
--
-- SELECT name, category, price_per_day, quantity_total, condition, sku
-- FROM public.gear_items
-- WHERE provider_id = '378345f6-1912-4f68-94dd-90c23b685d66'
-- ORDER BY created_at DESC
-- LIMIT 10;
-- ============================================================================
