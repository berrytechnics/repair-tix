-- Script to check and update user role
-- Run this in your database to check the user's role and update if needed

-- Step 1: Check current user info
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  company_id,
  active
FROM users
WHERE email = 'kyle@berrytechnics.com'
  AND deleted_at IS NULL;

-- Step 2: Update user role to admin (if needed)
-- Uncomment the line below and run it if the user is not already an admin
-- UPDATE users 
-- SET role = 'admin', updated_at = NOW()
-- WHERE email = 'kyle@berrytechnics.com' 
--   AND deleted_at IS NULL;

-- Step 3: Check if permissions exist for the user's company
-- Replace 'YOUR_COMPANY_ID' with the company_id from Step 1
SELECT 
  rp.role,
  rp.permission,
  COUNT(*) as count
FROM role_permissions rp
WHERE rp.company_id = (
  SELECT company_id 
  FROM users 
  WHERE email = 'kyle@berrytechnics.com' 
    AND deleted_at IS NULL
  LIMIT 1
)
GROUP BY rp.role, rp.permission
ORDER BY rp.role, rp.permission;

-- Step 4: If no permissions exist, initialize them for the company
-- This will use the database function created in the migration
-- Replace 'YOUR_COMPANY_ID' with the company_id from Step 1
-- SELECT initialize_company_permissions('YOUR_COMPANY_ID');

-- Step 5: Verify admin role has permissions.view
SELECT 
  rp.role,
  rp.permission
FROM role_permissions rp
WHERE rp.company_id = (
  SELECT company_id 
  FROM users 
  WHERE email = 'kyle@berrytechnics.com' 
    AND deleted_at IS NULL
  LIMIT 1
)
  AND rp.role = 'admin'
  AND rp.permission = 'permissions.view';

