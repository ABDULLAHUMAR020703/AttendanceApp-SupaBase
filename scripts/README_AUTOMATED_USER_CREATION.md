# Automated User Creation Script

## Overview

This script automates the process of creating users in Supabase Auth and the users table by reading from `new_users.txt`.

## Features

- ✅ Reads users from `new_users.txt`
- ✅ Automatically generates usernames and emails
- ✅ Creates users in Supabase Auth
- ✅ Inserts users into the database
- ✅ Optionally deletes existing users first
- ✅ Shows detailed progress and summary

## Prerequisites

1. **Supabase Environment Variables**
   - Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in:
     - `services/auth-service/.env` (preferred)
     - Or `.env` in project root

2. **Dependencies**
   ```bash
   npm install @supabase/supabase-js dotenv
   ```

3. **File Format**
   - `new_users.txt` must be in the project root
   - Format:
     ```
     Name Role
         Employee Name Position
     ```
   - Managers have no indentation
   - Employees are indented (4 spaces or tab)

## Usage

```bash
node scripts/create-new-users-automated.js
```

## File Format Examples

### Super Admin
```
hammad bakhtiar super admin
```

### Managers
```
Abdullah bin ali Engineering manager
Abdul Rehman Batt Technical manager
Bilawal Cheema Sales manager
Moiz Kazi HR manager
Balaj Nadeem Kiani Finance manager
```

### Employees (indented)
```
    Hasnain Ibrar Associate Engineer
    Abdullah Bin Umar Senior Technical Associate
    Samad Kiani Technical Associate
    Zidane Asghar sales Associate
```

## What the Script Does

1. **Parses** `new_users.txt` to extract user information
2. **Asks** if you want to delete existing users
3. **Creates** each user in Supabase Auth
4. **Inserts** each user into the `users` table
5. **Shows** a summary with login credentials

## Generated Credentials

- **Username**: Lowercase name with dots (e.g., `hammad.bakhtiar`)
- **Email**: `username@company.com`
- **Password**: Username without dots + "123" (e.g., `hammadbakhtiar123`)

## Example Output

```
🚀 Automated User Creation Script
============================================================

📖 Reading users from new_users.txt...
   ✅ Parsed 10 users

📋 Parsed Users:
   1. Hammad Bakhtiar (hammad.bakhtiar) - super_admin - Management
   2. Abdullah bin Ali (abdullah.bin.ali) - manager - Engineering
   ...

🗑️  Delete all existing users first? (y/n): y

[1/10] Creating: Hammad Bakhtiar (hammad.bakhtiar)
   Role: super_admin, Department: Management, Position: Super Admin
   🔐 Creating in Supabase Auth...
   ✅ Auth user created: <uid>
   💾 Inserting into database...
   ✅ Created in database
   📧 Email: hammad.bakhtiar@company.com
   🔑 Password: hammadbakhtiar123

...

📊 Creation Summary
============================================================
✅ Success: 10
❌ Failed: 0
📝 Total: 10

🔑 Login Credentials:
   hammad.bakhtiar          / hammadbakhtiar123    (super_admin)
   abdullah.bin.ali         / abdullahbinali123    (manager)
   ...
```

## Troubleshooting

### Error: Cannot find module '@supabase/supabase-js'
```bash
npm install @supabase/supabase-js dotenv
```

### Error: Missing Supabase environment variables
- Check that `services/auth-service/.env` exists
- Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set

### Error: File not found: new_users.txt
- Ensure `new_users.txt` is in the project root
- Check file name spelling

### User already exists
- The script will update existing users if they already exist
- Or delete all users first (answer 'y' to the prompt)

## Notes

- The script uses the **Service Role Key** which has admin privileges
- Users are created with **email confirmed** (no email verification needed)
- Default password format: `username123` (users should change after first login)
- Default work mode: `in_office`
- Default hire date: `2024-01-01`

