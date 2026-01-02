# User Migration Guide

## Overview

This guide explains how to delete all existing users and create new users from the `new_users.txt` file.

## User List

The following users will be created:

### Super Admin
- **Hammad Bakhtiar** - Super Admin (Management)

### Managers
- **Abdullah Bin Ali** - Engineering Manager (Engineering)
- **Abdul Rehman Batt** - Technical Manager (Engineering)
- **Bilawal Cheema** - Sales Manager (Sales)
- **Moiz Kazi** - HR Manager (HR)
- **Balaj Nadeem Kiani** - Finance Manager (Finance)

### Employees
- **Hasnain Ibrar** - Associate Engineer (Engineering) - under Engineering Manager
- **Abdullah Bin Umar** - Senior Technical Associate (Engineering) - under Technical Manager
- **Samad Kiani** - Technical Associate (Engineering) - under Technical Manager
- **Zidane Asghar** - Sales Associate (Sales) - under Sales Manager

## Steps to Execute

### Option 1: Manual Process (Recommended for First Time)

1. **Create Users in Supabase Auth**:
   - Go to Supabase Dashboard > Authentication > Users
   - Create a new user for each person in the list
   - Use the email format: `firstname.lastname@company.com`
   - Set a temporary password (users can change it later)
   - Copy the User ID (UID) for each user

2. **Update the SQL Script**:
   - Open `migrations/010_delete_and_create_new_users.sql`
   - Replace each `'REPLACE_WITH_AUTH_ID'` with the actual UID from Supabase Auth
   - Make sure the UID matches the correct user

3. **Run the SQL Script**:
   - Go to Supabase Dashboard > SQL Editor
   - Copy and paste the entire script
   - Execute the script
   - Verify the results using the verification queries at the end

### Option 2: Automated Script (Future Enhancement)

A Node.js script could be created to:
1. Read the user list
2. Create users in Supabase Auth automatically
3. Get their UIDs
4. Insert them into the users table

## Username Format

Usernames are generated as: `firstname.lastname` (lowercase, spaces replaced with dots)

Examples:
- `hammad.bakhtiar`
- `abdullah.bin.ali`
- `hasnain.ibrar`

## Email Format

Emails follow the pattern: `username@company.com`

Examples:
- `hammad.bakhtiar@company.com`
- `abdullah.bin.ali@company.com`

## Department Mapping

- **Engineering** - For Engineering Manager, Technical Manager, and all Engineering employees
- **Sales** - For Sales Manager and Sales employees
- **HR** - For HR Manager
- **Finance** - For Finance Manager
- **Management** - For Super Admin

## Role Mapping

- **super_admin** - For Hammad Bakhtiar
- **manager** - For all managers (Engineering, Technical, Sales, HR, Finance)
- **employee** - For all associates and engineers

## Default Values

- **work_mode**: `in_office` (all users)
- **hire_date**: Set to dates in 2024 (you can adjust these)
- **is_active**: `true` (all users)

## Important Notes

⚠️ **WARNING**: The DELETE statement will remove ALL existing users. Make sure you:
- Have backups if needed
- Have created the new users in Supabase Auth first
- Have the UIDs ready before running the script

## Verification

After running the script, verify:
1. All users were created (check count)
2. Roles are correct (1 super_admin, 5 managers, 4 employees)
3. Departments are correct
4. Usernames and emails are correct

## Troubleshooting

### Error: Foreign Key Constraint
If you get foreign key errors, you may need to:
1. Delete related records first (attendance_records, leave_requests, tickets, etc.)
2. Or set `is_active = false` instead of deleting
3. Or use CASCADE delete (if foreign keys are set up that way)

### Error: UID Not Found
Make sure:
- Users are created in Supabase Auth first
- UIDs are copied correctly (they're UUIDs)
- No extra spaces in the UID

### Missing Users
Check:
- All UIDs were replaced correctly
- No syntax errors in SQL
- All INSERT statements executed successfully

