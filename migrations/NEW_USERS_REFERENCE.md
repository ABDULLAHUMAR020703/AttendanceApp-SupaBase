# New Users Reference

## User List Summary

Total: **10 users**
- 1 Super Admin
- 5 Managers
- 4 Employees

## User Details

### Super Admin

| Username | Email | Name | Role | Department | Position |
|----------|-------|------|------|------------|----------|
| `hammad.bakhtiar` | hammad.bakhtiar@company.com | Hammad Bakhtiar | super_admin | Management | Super Admin |

### Managers

| Username | Email | Name | Role | Department | Position |
|----------|-------|------|------|------------|----------|
| `abdullah.bin.ali` | abdullah.bin.ali@company.com | Abdullah Bin Ali | manager | Engineering | Engineering Manager |
| `abdul.rehman.batt` | abdul.rehman.batt@company.com | Abdul Rehman Batt | manager | Engineering | Technical Manager |
| `bilawal.cheema` | bilawal.cheema@company.com | Bilawal Cheema | manager | Sales | Sales Manager |
| `moiz.kazi` | moiz.kazi@company.com | Moiz Kazi | manager | HR | HR Manager |
| `balaj.nadeem.kiani` | balaj.nadeem.kiani@company.com | Balaj Nadeem Kiani | manager | Finance | Finance Manager |

### Employees

| Username | Email | Name | Role | Department | Position | Manager |
|----------|-------|------|------|------------|----------|---------|
| `hasnain.ibrar` | hasnain.ibrar@company.com | Hasnain Ibrar | employee | Engineering | Associate Engineer | Abdullah Bin Ali |
| `abdullah.bin.umar` | abdullah.bin.umar@company.com | Abdullah Bin Umar | employee | Engineering | Senior Technical Associate | Abdul Rehman Batt |
| `samad.kiani` | samad.kiani@company.com | Samad Kiani | employee | Engineering | Technical Associate | Abdul Rehman Batt |
| `zidane.asghar` | zidane.asghar@company.com | Zidane Asghar | employee | Sales | Sales Associate | Bilawal Cheema |

## Department Structure

### Engineering Department
- **Managers**: 
  - Abdullah Bin Ali (Engineering Manager)
  - Abdul Rehman Batt (Technical Manager)
- **Employees**:
  - Hasnain Ibrar (Associate Engineer) → Reports to Engineering Manager
  - Abdullah Bin Umar (Senior Technical Associate) → Reports to Technical Manager
  - Samad Kiani (Technical Associate) → Reports to Technical Manager

### Sales Department
- **Manager**: Bilawal Cheema (Sales Manager)
- **Employees**:
  - Zidane Asghar (Sales Associate) → Reports to Sales Manager

### HR Department
- **Manager**: Moiz Kazi (HR Manager)
- **Employees**: None

### Finance Department
- **Manager**: Balaj Nadeem Kiani (Finance Manager)
- **Employees**: None

## Quick Steps to Execute

1. **Create Users in Supabase Auth** (10 users total):
   ```
   For each user:
   - Email: [username]@company.com
   - Password: Set temporary password (users can change later)
   - Copy the User ID (UID)
   ```

2. **Update SQL Script**:
   - Open `migrations/010_delete_and_create_new_users.sql`
   - Replace each `'REPLACE_WITH_AUTH_ID'` with the actual UID
   - Match UIDs to the correct users

3. **Run SQL Script**:
   - Execute in Supabase SQL Editor
   - Verify with the verification queries

## Default Values

- **work_mode**: `in_office` (all users)
- **hire_date**: Set to dates in 2024 (adjustable)
- **is_active**: `true` (all users)

## Notes

- Usernames are lowercase with dots replacing spaces
- All emails follow the pattern: `username@company.com`
- Engineering department has 2 managers (Engineering Manager and Technical Manager)
- Technical Manager and Engineering Manager both manage Engineering employees
- Leave requests with category "technical" will route to Technical Manager
- Leave requests with category "hr" will route to HR Manager
- Leave requests with category "finance" will route to Finance Manager
- Leave requests with category "other" will route to Super Admin

