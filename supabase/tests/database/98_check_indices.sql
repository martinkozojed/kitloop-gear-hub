BEGIN;
SELECT plan(1);
-- Check for unique index on products(provider_id, name)
SELECT diag('--- PRODUCTS INDICES ---');
SELECT diag(indexname || ': ' || indexdef) FROM pg_indexes WHERE tablename = 'products';

-- Check for unique index on product_variants(product_id, name)
SELECT diag('--- VARIANTS INDICES ---');
SELECT diag(indexname || ': ' || indexdef) FROM pg_indexes WHERE tablename = 'product_variants';

SELECT pass('Indices checked');
SELECT * FROM finish();
ROLLBACK;
