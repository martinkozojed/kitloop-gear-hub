# 🔧 Inventory System Troubleshooting Guide

Quick reference for resolving common issues during setup and testing of the Kitloop Inventory Management System.

---

## 📦 Database Issues

### ❌ Migration Fails to Run

**Symptom:**
- SQL error when running `add_inventory_columns.sql`
- Error: "column already exists" or similar

**Likely Cause:**
Migration was already run partially or columns were added manually.

**Quick Fix:**
1. Check existing columns:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'gear_items'
  AND table_schema = 'public';
```

2. If columns exist, skip to next migration. If partial, manually add missing columns:
```sql
-- Example: Add only missing columns
ALTER TABLE public.gear_items
ADD COLUMN IF NOT EXISTS quantity_total INTEGER DEFAULT 1;
```

---

### ❌ RLS Policy Blocks Access

**Symptom:**
- Error: "new row violates row-level security policy"
- Can't insert/update items even when logged in
- Console error: `PGRST301` or `permission denied`

**Likely Cause:**
1. RLS policies not created for new columns
2. Provider profile missing or not linked to user
3. Wrong provider_id being used

**Quick Fix:**

**Step 1:** Verify provider profile exists:
```sql
SELECT id, user_id, business_name
FROM public.providers
WHERE user_id = auth.uid();
```

If empty → You need to complete provider setup first at `/provider/setup`

**Step 2:** Check RLS policies:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'gear_items';
```

**Step 3:** Re-create policies if missing:
```sql
-- Allow providers to insert their own items
CREATE POLICY "Providers can insert own items"
ON gear_items FOR INSERT
TO authenticated
WITH CHECK (provider_id IN (
  SELECT id FROM providers WHERE user_id = auth.uid()
));

-- Allow providers to update their own items
CREATE POLICY "Providers can update own items"
ON gear_items FOR UPDATE
TO authenticated
USING (provider_id IN (
  SELECT id FROM providers WHERE user_id = auth.uid()
));
```

---

### ❌ Storage Bucket Not Accessible

**Symptom:**
- Error: `storage/object-not-found`
- Images don't upload
- Console: "Bucket 'gear-images' not found"

**Likely Cause:**
Storage bucket `gear-images` wasn't created in Supabase Dashboard.

**Quick Fix:**

**Step 1:** Create bucket manually:
1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `gear-images`
4. **Public bucket:** YES ✅
5. Click Create

**Step 2:** Run storage policies:
```bash
# In Supabase SQL Editor
# Run: supabase/migrations/storage_policies.sql
```

**Step 3:** Verify bucket exists:
```sql
SELECT id, name, public
FROM storage.buckets
WHERE name = 'gear-images';
```

Should return: `{ id: '...', name: 'gear-images', public: true }`

---

### ❌ Can't Find Provider ID for Seed Data

**Symptom:**
- Need to replace `YOUR_PROVIDER_ID_HERE` in seed file
- Don't know your provider UUID

**Quick Fix:**

**Get your provider_id:**
```sql
-- If logged in as provider
SELECT id, business_name, user_id
FROM public.providers
WHERE user_id = auth.uid();
```

**Or get all providers (admin only):**
```sql
SELECT id, business_name, email
FROM public.providers
ORDER BY created_at DESC
LIMIT 5;
```

Copy the `id` UUID and replace in `seed_demo_inventory.sql`:
```sql
-- Change this line:
demo_provider_id UUID := 'YOUR_PROVIDER_ID_HERE';

-- To something like:
demo_provider_id UUID := '550e8400-e29b-41d4-a716-446655440000';
```

---

## 🖼️ Image Upload Issues

### ❌ Images Don't Upload

**Symptom:**
- Form submits but no image appears
- Console: Upload error or timeout
- Toast: "Nepodařilo se nahrát obrázek"

**Likely Cause:**
1. File too large (>5MB)
2. Wrong file format
3. Storage bucket not public
4. Network timeout

**Quick Fix:**

**Step 1:** Check file size and format:
- Max size: 5MB per image
- Allowed formats: JPG, PNG, WEBP
- Use image compression tool if needed

**Step 2:** Verify storage RLS policies:
```sql
-- Check policies on storage.objects
SELECT * FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects';
```

**Step 3:** Test upload manually:
```javascript
// Open browser console on /provider/inventory/new
const testUpload = async () => {
  const { data, error } = await supabase.storage
    .from('gear-images')
    .list('', { limit: 1 });
  console.log('Bucket accessible:', !error, data);
};
testUpload();
```

---

### ❌ Images Don't Display

**Symptom:**
- Image uploaded successfully
- Image URL saved to database
- But image shows broken icon or Package placeholder

**Likely Cause:**
1. CORS issue (cross-origin)
2. Bucket not public
3. Wrong URL format

**Quick Fix:**

**Step 1:** Check image URL format:
```sql
SELECT name, image_url
FROM gear_items
WHERE image_url IS NOT NULL
LIMIT 5;
```

Should look like:
```
https://[project-ref].supabase.co/storage/v1/object/public/gear-images/[provider-id]/[filename]
```

**Step 2:** Verify bucket is public:
```sql
UPDATE storage.buckets
SET public = true
WHERE name = 'gear-images';
```

**Step 3:** Test URL in browser:
- Copy an `image_url` from database
- Paste into browser address bar
- Should display image directly
- If not → bucket is not public or file missing

---

### ❌ CORS Errors

**Symptom:**
- Browser console: "CORS policy: No 'Access-Control-Allow-Origin' header"
- Images load on same domain but not cross-domain

**Likely Cause:**
Supabase project CORS settings need updating (rare - usually works by default).

**Quick Fix:**

**Step 1:** Check Supabase project settings:
1. Go to Dashboard → Settings → API
2. Check "Additional Allowed Origins"
3. Add your local dev URL if needed: `http://localhost:5173`

**Step 2:** For production, ensure your domain is whitelisted in Supabase.

---

## 📤 CSV Import Issues

### ❌ CSV Parse Errors

**Symptom:**
- Error: "Failed to parse CSV"
- Validation errors on Czech characters (ř, š, č, etc.)
- Random characters appear in preview

**Likely Cause:**
CSV not saved in UTF-8 encoding.

**Quick Fix:**

**Step 1:** Re-save CSV as UTF-8:

**Excel:**
1. File → Save As
2. Format: CSV UTF-8 (Comma delimited) (.csv)
3. Save

**Google Sheets:**
1. File → Download → Comma Separated Values (.csv)
2. Should be UTF-8 by default

**LibreOffice Calc:**
1. File → Save As
2. File type: Text CSV (.csv)
3. Character set: **Unicode (UTF-8)** ✅
4. Field delimiter: `,` (comma)
5. String delimiter: `"` (double quote)
6. Save

**Step 2:** Re-upload file to `/provider/inventory/import`

---

### ❌ Wrong Column Names

**Symptom:**
- Error: "Chybí povinné sloupce: name, category, price_per_day"
- Columns look correct in Excel but import fails

**Likely Cause:**
1. Extra spaces in column headers
2. Wrong delimiter used (semicolon instead of comma)
3. Headers missing entirely

**Quick Fix:**

**Step 1:** Download template again:
- Go to `/provider/inventory/import`
- Click "Download CSV Template"
- Use this as base for your data

**Step 2:** Check column headers match exactly:
```
name,category,description,price_per_day,quantity_total,condition,sku,location,notes
```

**Step 3:** If using Excel, ensure "Comma" is delimiter:
- Save As → Tools/Options → Field separator: `,`

---

### ❌ Invalid Categories

**Symptom:**
- Validation error: "Neplatná kategorie '...'"
- Items appear in preview but can't import

**Likely Cause:**
Category values don't match allowed categories.

**Quick Fix:**

**Use only these category values:**
- `ferraty` - Via Ferrata
- `lezeni` - Climbing
- `horolezectvi` - Mountaineering
- `zimni` - Winter Sports
- `skialpinismus` - Ski Touring
- `camping` - Camping
- `cyklo` - Cycling
- `bezky` - Cross-country Skiing

**Example CSV:**
```csv
name,category,description,price_per_day,quantity_total,condition,sku,location,notes
"Ferrata Set",ferraty,"Complete set",200,5,good,FS-001,"Warehouse A",""
"Tent 2-person",camping,"MSR Hubba",150,3,good,TENT-01,"Storage",""
```

---

### ❌ Duplicate SKUs

**Symptom:**
- Error: "Duplikátní SKU '...' v CSV"
- Or: "Některá SKU již existují v databázi"

**Likely Cause:**
1. Same SKU appears twice in CSV
2. SKU already exists in database from previous import

**Quick Fix:**

**Step 1:** Find duplicate SKUs in CSV:
```sql
-- After partial import, check existing SKUs
SELECT sku, COUNT(*)
FROM gear_items
WHERE provider_id = 'YOUR_PROVIDER_ID'
  AND sku IS NOT NULL
GROUP BY sku
HAVING COUNT(*) > 1;
```

**Step 2:** Options:
- Remove SKU column from CSV (SKU is optional)
- Make SKUs unique by adding suffix: `FS-001-A`, `FS-001-B`
- Delete old items first if re-importing

---

### ❌ Price or Quantity Validation Errors

**Symptom:**
- "Řádek X: Cena musí být číslo větší než 0"
- "Řádek X: Množství musí být číslo minimálně 1"

**Likely Cause:**
1. Empty cells in required fields
2. Text in number fields (e.g., "200 Kč" instead of "200")
3. Decimal comma instead of decimal point

**Quick Fix:**

**Step 1:** Check number formats:
- Price: `200` or `200.50` ✅ (no currency symbol)
- Quantity: `5` ✅ (integer only)
- Wrong: `200 Kč`, `200,50`, `five` ❌

**Step 2:** In Excel/Sheets, format columns as Number:
- Select price column → Format Cells → Number → 0 decimals
- Select quantity column → Format Cells → Number → 0 decimals

---

## 🎨 UI Issues

### ❌ Empty State Doesn't Show

**Symptom:**
- Navigate to `/provider/inventory`
- See blank page or just header
- No "Add First Item" button

**Likely Cause:**
1. JavaScript error in console
2. Loading state stuck
3. Provider context not loaded

**Quick Fix:**

**Step 1:** Open browser console (F12):
- Check for errors in red
- Look for "provider is undefined" or similar

**Step 2:** Verify provider context:
```javascript
// In browser console on inventory page
console.log('Provider:', window);
// Check React DevTools → Components → ProviderInventory → hooks → provider
```

**Step 3:** Refresh page or clear cache:
```bash
# Hard refresh
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

**Step 4:** Check authentication:
- Make sure you're logged in
- Navigate to `/provider/dashboard` first
- Then go to `/provider/inventory`

---

### ❌ Mobile View Broken

**Symptom:**
- Cards overlap or cut off on mobile
- Filters not stacking vertically
- Buttons too small to tap

**Likely Cause:**
1. Tailwind CSS not loading
2. Responsive classes not applied
3. Viewport meta tag missing

**Quick Fix:**

**Step 1:** Check viewport meta tag in `index.html`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

**Step 2:** Test responsive breakpoints:
- Open Chrome DevTools (F12)
- Click device toolbar icon (or Ctrl+Shift+M)
- Test at 375px width (iPhone SE)
- Should see cards, not table

**Step 3:** Verify Tailwind build:
```bash
# Restart dev server
npm run dev
```

---

### ❌ Filters Not Working

**Symptom:**
- Type in search → no results filtered
- Select category → nothing changes
- Status filter has no effect

**Likely Cause:**
1. State not updating
2. Filter logic error
3. React hooks issue

**Quick Fix:**

**Step 1:** Check console for errors

**Step 2:** Verify data loaded:
```javascript
// In browser console
// Should show array of items
console.log(document.querySelector('[data-items]'));
```

**Step 3:** Test filters manually:
- Try searching for exact item name
- Select one category and verify items match
- Clear filters (refresh page)

**Step 4:** Debug query in code:
```typescript
// src/pages/provider/ProviderInventory.tsx:103-108
console.log('Search:', searchQuery);
console.log('Category:', selectedCategory);
console.log('Status:', selectedStatus);
console.log('Filtered items:', filteredItems);
```

---

## 🐛 Common Error Messages

### "Chyba: Nenalezen profil poskytovatele"

**Meaning:** Provider profile not found

**Fix:**
1. Complete provider setup at `/provider/setup`
2. Verify profile exists: `SELECT * FROM providers WHERE user_id = auth.uid();`

---

### "Nemáte oprávnění zobrazit tento inventář"

**Meaning:** RLS policy blocking access

**Fix:**
1. Re-run migrations: `add_inventory_columns.sql`
2. Check provider_id matches your user
3. Verify RLS policies (see Database Issues section)

---

### "Bucket 'gear-images' nenalezen"

**Meaning:** Storage bucket doesn't exist

**Fix:**
1. Create bucket in Supabase Dashboard → Storage
2. Name: `gear-images`, Public: YES
3. Run `storage_policies.sql`

---

### "Duplikátní SKU"

**Meaning:** SKU already exists in database or CSV

**Fix:**
1. Change SKU to unique value
2. Or remove SKU column (it's optional)
3. Or delete old item first

---

## 🔍 Debug SQL Queries

### Check All Inventory Items

```sql
SELECT
  gi.name,
  gi.category,
  gi.price_per_day,
  gi.quantity_total,
  gi.quantity_available,
  gi.item_state,
  gi.image_url,
  p.business_name AS provider_name
FROM gear_items gi
LEFT JOIN providers p ON gi.provider_id = p.id
WHERE p.user_id = auth.uid()
ORDER BY gi.created_at DESC
LIMIT 20;
```

---

### Check Storage Usage

```sql
SELECT
  bucket_id,
  COUNT(*) as file_count,
  SUM(metadata->>'size')::bigint as total_bytes,
  ROUND(SUM((metadata->>'size')::bigint) / 1024.0 / 1024.0, 2) as total_mb
FROM storage.objects
WHERE bucket_id = 'gear-images'
GROUP BY bucket_id;
```

---

### Find Items Without Images

```sql
SELECT id, name, category, created_at
FROM gear_items
WHERE provider_id IN (
  SELECT id FROM providers WHERE user_id = auth.uid()
)
AND (image_url IS NULL OR image_url = '')
ORDER BY created_at DESC;
```

---

### Find Orphaned Images

```sql
-- Images in storage.objects but no gear_item references them
SELECT name, created_at
FROM storage.objects
WHERE bucket_id = 'gear-images'
  AND name NOT IN (
    SELECT SUBSTRING(image_url FROM 'gear-images/(.+)$')
    FROM gear_items
    WHERE image_url IS NOT NULL
  )
LIMIT 20;
```

---

## 📞 Still Having Issues?

### Quick Checklist:

- [ ] All migrations run successfully
- [ ] Provider profile exists and is linked to your user
- [ ] Storage bucket `gear-images` created and public
- [ ] Storage RLS policies applied
- [ ] Browser console shows no errors
- [ ] Hard refresh the page (Ctrl+Shift+R)
- [ ] Logged in as provider (not customer)

### Get Help:

1. **Check console logs:**
   - Look for 🔴 red errors
   - Copy full error message

2. **Check network tab:**
   - Open DevTools → Network
   - Look for failed requests (red)
   - Check response for error details

3. **Verify database state:**
   - Use SQL queries above
   - Check RLS policies
   - Verify foreign keys

4. **Contact Support:**
   - Include error message
   - Include browser console output
   - Include relevant SQL query results

---

## ✅ Test Checklist After Fixing

Once you've resolved an issue, verify:

- [ ] Can view inventory list at `/provider/inventory`
- [ ] Can add new item with image
- [ ] Can edit existing item
- [ ] Can delete item (with confirmation)
- [ ] Can search and filter items
- [ ] Can import CSV with demo data
- [ ] Mobile view works at 375px width
- [ ] No console errors

---

**Last Updated:** 2025-11-12
**Version:** 1.0
**For:** Kitloop Inventory Management System
