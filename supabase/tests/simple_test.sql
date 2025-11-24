-- Simple test to check if pgtap is working
BEGIN;
SELECT plan(1);
SELECT pass('Simple test passed');
SELECT finish();
ROLLBACK;
