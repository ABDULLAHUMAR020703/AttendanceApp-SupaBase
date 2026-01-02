# Update UID Column to Match Supabase Auth User IDs

## Overview

This guide explains how to update the `uid` column in the `users` table to match the Supabase Auth user IDs. The `uid` column should contain the same UUID as the Supabase Auth user ID for each user.

## Why This Is Needed

The `uid` column in the `users` table must match the Supabase Auth user ID (`auth.uid()`) for:
- Authentication to work correctly
- RLS (Row Level Security) policies to function
- User data loading to succeed

## Method 1: Manual Update via Supabase Dashboard (Recommended)

### Step 1: Get Supabase Auth User IDs

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. For each user, copy their **User ID** (UUID format)
3. Note down the email for each user to match them correctly

### Step 2: Update Users Table

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run the following SQL script, replacing the UUIDs with actual values:

```sql
-- Update UID for each user
-- Replace the UUIDs and emails with actual values

-- Example: Update user by email
UPDATE users 
SET uid = 'REPLACE_WITH_SUPABASE_AUTH_UID'
WHERE email = 'user@company.com';

-- Repeat for each user
UPDATE users 
SET uid = 'REPLACE_WITH_SUPABASE_AUTH_UID'
WHERE email = 'another.user@company.com';
```

### Step 3: Verify Updates

Run this query to verify all users have matching UIDs:

```sql
-- Check users and their UIDs
SELECT 
  username,
  email,
  uid,
  role,
  department
FROM users
ORDER BY username;
```

## Method 2: Automated SQL Script

### Step 1: Get All Auth User IDs

Run this query in Supabase SQL Editor to get all Auth users and their emails:

```sql
-- Get all Supabase Auth users (requires admin access)
-- Note: This might not work directly in SQL Editor
-- You may need to use the Supabase Admin API or Dashboard
```

### Step 2: Create Update Script

Create a SQL script with all your users:

```sql
-- ============================================
-- Update UID Column to Match Supabase Auth IDs
-- ============================================
-- Replace all UUIDs with actual Supabase Auth User IDs

BEGIN;

-- Update each user's UID
UPDATE users 
SET uid = 'UUID_FROM_SUPABASE_AUTH_1'
WHERE email = 'user1@company.com';

UPDATE users 
SET uid = 'UUID_FROM_SUPABASE_AUTH_2'
WHERE email = 'user2@company.com';

-- Add more UPDATE statements for each user...

-- Verify updates
SELECT 
  username,
  email,
  uid,
  CASE 
    WHEN uid IS NULL THEN '❌ Missing UID'
    WHEN LENGTH(uid::text) != 36 THEN '❌ Invalid UID format'
    ELSE '✓ OK'
  END as status
FROM users
ORDER BY username;

COMMIT;
```

## Method 3: Using Supabase Admin API (Programmatic)

If you have access to the Supabase Admin API, you can create a script:

```javascript
// Example Node.js script
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY'; // Admin key

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateUserUIDs() {
  // Get all users from Auth
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('Error fetching auth users:', authError);
    return;
  }

  // Update each user's UID in the users table
  for (const authUser of authUsers) {
    const { data, error } = await supabase
      .from('users')
      .update({ uid: authUser.id })
      .eq('email', authUser.email)
      .select();

    if (error) {
      console.error(`Error updating ${authUser.email}:`, error);
    } else {
      console.log(`✓ Updated UID for ${authUser.email}`);
    }
  }
}

updateUserUIDs();
```

## Method 4: Bulk Update Script (If You Have a Mapping)

If you have a CSV or list mapping emails to Auth UIDs:

```sql
-- Bulk update using a temporary table
CREATE TEMP TABLE uid_mapping (
  email VARCHAR(255),
  auth_uid UUID
);

-- Insert your mappings
INSERT INTO uid_mapping (email, auth_uid) VALUES
  ('user1@company.com', 'UUID_1'),
  ('user2@company.com', 'UUID_2'),
  -- Add more mappings...
;

-- Update users table
UPDATE users u
SET uid = m.auth_uid
FROM uid_mapping m
WHERE u.email = m.email;

-- Verify
SELECT 
  u.username,
  u.email,
  u.uid,
  m.auth_uid,
  CASE 
    WHEN u.uid = m.auth_uid THEN '✓ Match'
    ELSE '❌ Mismatch'
  END as status
FROM users u
LEFT JOIN uid_mapping m ON u.email = m.email
ORDER BY u.username;

-- Clean up
DROP TABLE uid_mapping;
```

## Verification Queries

After updating, run these queries to verify:

### Check for Missing UIDs
```sql
SELECT username, email, uid
FROM users
WHERE uid IS NULL;
```

### Check for Invalid UID Format
```sql
SELECT username, email, uid
FROM users
WHERE uid IS NOT NULL 
  AND LENGTH(uid::text) != 36;
```

### Check All Users Have UIDs
```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(uid) as users_with_uid,
  COUNT(*) - COUNT(uid) as missing_uid
FROM users;
```

## Troubleshooting

### Error: "uid already exists"
- This means the UID you're trying to set is already used by another user
- Check which user has that UID: `SELECT * FROM users WHERE uid = 'THE_UID';`
- Make sure each UID is unique

### Error: "Invalid UUID format"
- UIDs must be valid UUIDs (36 characters with hyphens)
- Format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- Check the Supabase Auth User ID format

### Users Not Found
- Verify the email in the `users` table matches the email in Supabase Auth
- Check for case sensitivity: emails should match exactly

## Important Notes

⚠️ **Before Running Updates:**
1. **Backup your database** - Always backup before making bulk updates
2. **Test on one user first** - Update one user and verify it works
3. **Check for foreign key constraints** - Make sure updating UID won't break relationships

⚠️ **After Updating:**
1. **Test login** - Try logging in with a few users
2. **Check RLS policies** - Verify users can access their own data
3. **Monitor for errors** - Check application logs for any issues

## Quick Reference

- **Supabase Auth User ID**: Found in Dashboard → Authentication → Users → User ID
- **Users Table UID**: Should match the Supabase Auth User ID exactly
- **Format**: UUID (36 characters: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

