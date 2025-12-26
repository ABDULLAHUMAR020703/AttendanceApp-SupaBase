-- ============================================
-- Manual User Creation Script for Supabase
-- Complete SQL script with all demo users
-- ============================================
-- 
-- IMPORTANT: Before running this script:
-- 1. Create users in Supabase Auth first (see MANUAL_USER_CREATION_GUIDE.md)
-- 2. Replace 'REPLACE_WITH_AUTH_ID' with actual Supabase Auth User IDs
-- 3. Or use the Node.js script which does this automatically
-- ============================================

-- ============================================
-- SUPER ADMIN
-- ============================================
INSERT INTO users (uid, username, email, name, role, department, position, work_mode, hire_date, is_active)
VALUES (
  'REPLACE_WITH_AUTH_ID',  -- Replace with Supabase Auth User ID
  'testadmin',
  'testadmin@company.com',
  'Test Admin',
  'super_admin',
  'Management',
  'System Administrator',
  'in_office',
  '2023-01-01',
  true
)
ON CONFLICT (username) DO UPDATE SET
  uid = EXCLUDED.uid,
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  position = EXCLUDED.position,
  work_mode = EXCLUDED.work_mode,
  hire_date = EXCLUDED.hire_date,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================================
-- MANAGERS
-- ============================================
INSERT INTO users (uid, username, email, name, role, department, position, work_mode, hire_date, is_active)
VALUES 
  ('REPLACE_WITH_AUTH_ID', 'hrmanager', 'hrmanager@company.com', 'HR Manager', 'manager', 'HR', 'HR Manager', 'in_office', '2022-03-01', true),
  ('REPLACE_WITH_AUTH_ID', 'techmanager', 'techmanager@company.com', 'Tech Manager', 'manager', 'Engineering', 'Engineering Manager', 'in_office', '2022-02-15', true),
  ('REPLACE_WITH_AUTH_ID', 'salesmanager', 'salesmanager@company.com', 'Sales Manager', 'manager', 'Sales', 'Sales Manager', 'in_office', '2022-01-20', true)
ON CONFLICT (username) DO UPDATE SET
  uid = EXCLUDED.uid,
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  position = EXCLUDED.position,
  work_mode = EXCLUDED.work_mode,
  hire_date = EXCLUDED.hire_date,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================================
-- EMPLOYEES
-- ============================================
INSERT INTO users (uid, username, email, name, role, department, position, work_mode, hire_date, is_active)
VALUES 
  ('REPLACE_WITH_AUTH_ID', 'testuser', 'testuser@company.com', 'Test User', 'employee', 'Engineering', 'AI Engineer', 'in_office', '2023-01-15', true),
  ('REPLACE_WITH_AUTH_ID', 'john.doe', 'john.doe@company.com', 'John Doe', 'employee', 'Engineering', 'Senior AI Engineer', 'semi_remote', '2022-06-10', true),
  ('REPLACE_WITH_AUTH_ID', 'jane.smith', 'jane.smith@company.com', 'Jane Smith', 'employee', 'Design', 'UI/UX Designer', 'fully_remote', '2022-08-20', true),
  ('REPLACE_WITH_AUTH_ID', 'mike.johnson', 'mike.johnson@company.com', 'Mike Johnson', 'employee', 'Sales', 'Sales Manager', 'in_office', '2022-03-15', true),
  ('REPLACE_WITH_AUTH_ID', 'sarah.williams', 'sarah.williams@company.com', 'Sarah Williams', 'employee', 'Marketing', 'Marketing Specialist', 'semi_remote', '2023-02-01', true),
  ('REPLACE_WITH_AUTH_ID', 'david.brown', 'david.brown@company.com', 'David Brown', 'employee', 'Engineering', 'DevOps Engineer', 'fully_remote', '2022-11-05', true),
  ('REPLACE_WITH_AUTH_ID', 'emily.davis', 'emily.davis@company.com', 'Emily Davis', 'employee', 'HR', 'HR Coordinator', 'in_office', '2023-04-12', true)
ON CONFLICT (username) DO UPDATE SET
  uid = EXCLUDED.uid,
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  position = EXCLUDED.position,
  work_mode = EXCLUDED.work_mode,
  hire_date = EXCLUDED.hire_date,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================================
-- Verification Query
-- ============================================
-- Run this after inserting to verify all users were created:
SELECT 
  username,
  email,
  name,
  role,
  department,
  position,
  work_mode,
  is_active
FROM users
ORDER BY 
  CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'employee' THEN 3
  END,
  username;

-- Count by role
SELECT role, COUNT(*) as count FROM users GROUP BY role;

