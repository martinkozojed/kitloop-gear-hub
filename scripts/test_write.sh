#!/bin/bash
# scripts/test_write.sh
# Wrapper to run the Standalone Write Smoke Test

echo "Running Write Smoke Verification..."

# Check if supabase is running
if ! supabase status > /dev/null 2>&1; then
    echo "Error: Supabase is not running."
    exit 1
fi

# Run the SQL script using local postgres credentials from Supabase
# Default supabase db URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
# Adjust port if necessary (supabase status shows it). Standard is 54322 for local.

# Find Supabase DB container (works for local supabase start)
DB_CONTAINER=$(docker ps --format "{{.Names}}" | grep supabase_db_ | head -n 1)

if [ -z "$DB_CONTAINER" ]; then
    echo "Error: Supabase DB container not found."
    exit 1
fi

echo "Found DB Container: $DB_CONTAINER"

# Run Script inside container
# We pipe the file content into docker exec
cat scripts/smoke_write.sql | docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1

if [ $? -eq 0 ]; then
    echo "✅ Write Verification PASSED"
else
    echo "❌ Write Verification FAILED"
    exit 1
fi
