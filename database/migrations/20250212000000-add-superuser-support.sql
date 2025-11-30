-- Migration: Add Superuser Support
-- Description: Adds superuser role support, allows NULL company_id for superusers, and updates constraints
-- Date: 2025-02-12

-- Step 1: Drop the NOT NULL constraint on users.company_id to allow superusers
ALTER TABLE users ALTER COLUMN company_id DROP NOT NULL;

-- Step 2: Drop the existing unique constraint on email + company_id
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_company_unique;

-- Step 3: Create a new unique constraint that allows NULL company_id for superusers
-- This constraint ensures:
-- - If company_id is NULL, email must be unique globally (for superusers)
-- - If company_id is NOT NULL, email must be unique within that company
CREATE UNIQUE INDEX IF NOT EXISTS users_email_company_unique 
ON users(email, COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Step 4: Add index for superuser queries (users with NULL company_id)
CREATE INDEX IF NOT EXISTS idx_users_superuser ON users(role, company_id) 
WHERE company_id IS NULL AND role = 'superuser';

-- Step 5: Add comment explaining superuser support
COMMENT ON COLUMN users.company_id IS 'Company ID for tenant users. NULL for superusers who can access all companies.';

