# System Architecture & User Management Guide

## Table of Contents
1. [Overview](#overview)
2. [Code Architecture](#code-architecture)
3. [Authentication System](#authentication-system)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Employee Data Structure](#employee-data-structure)
6. [Firebase Integration](#firebase-integration)
7. [Ticket Routing System](#ticket-routing-system)
8. [Data Storage](#data-storage)
9. [Login Flow](#login-flow)
10. [Employee Management](#employee-management)

---

## Overview

This attendance management system uses **Firebase Authentication** and **Firestore** for user management, with **AsyncStorage** for local data persistence. The system supports three authentication roles with different permission levels and automatic ticket routing based on departments.

The codebase follows a **modular, feature-based architecture** where each feature is self-contained and isolated, ensuring features don't interfere with each other and the code is deployment-ready.

---

## Code Architecture

### Modular Structure

The application is organized into three main layers:

#### 1. Core (`core/`)
Core infrastructure that the entire app depends on:
- **`config/`**: Firebase and app configuration
- **`contexts/`**: React Context providers (Auth, Theme)
- **`navigation/`**: Navigation setup and routing
- **`services/`**: Core services (storage abstraction)

#### 2. Features (`features/`)
Self-contained feature modules:
- **`auth/`**: Authentication (login, signup, biometric)
- **`attendance/`**: Attendance tracking (check-in/out, history)
- **`tickets/`**: Ticket management and routing
- **`leave/`**: Leave request management
- **`employees/`**: Employee management
- **`notifications/`**: Notification system
- **`calendar/`**: Calendar and events
- **`analytics/`**: Analytics and dashboards

Each feature contains:
- `screens/` - UI components
- `services/` - Business logic
- `utils/` - Feature-specific utilities
- `index.js` - Public API exports

#### 3. Shared (`shared/`)
Reusable code across features:
- **`components/`**: Reusable UI components (Logo, Trademark, etc.)
- **`utils/`**: Shared utilities (responsive, export)
- **`constants/`**: Constants and enums (roles, workModes, routes)
- **`hooks/`**: Shared React hooks

### Architecture Benefits

1. **Feature Isolation**: Changes to one feature don't affect others
2. **Clear Dependencies**: Features only import from `shared/` and `core/`
3. **Deployment Ready**: Clear structure for CI/CD pipelines
4. **Maintainability**: Easy to find and modify code by feature
5. **Scalability**: Easy to add new features without affecting existing ones

### Import Patterns

```javascript
// Import from features
import { authenticateUser } from '../features/auth';

// Import from shared
import { ROLES } from '../shared/constants/roles';
import { WORK_MODES } from '../shared/constants/workModes';

// Import from core
import { useAuth } from '../core/contexts/AuthContext';
import { storage } from '../core/services/storage';
```

### Navigation Structure

- **`AppNavigator.js`**: Main router that decides between auth and main navigation
- **`AuthNavigator.js`**: Handles login/signup flow
- **`MainNavigator.js`**: Routes based on user role (employee, manager, super_admin)

For detailed architecture documentation, see `docs/MODULAR_ARCHITECTURE.md`.

---

## Authentication System

### How Authentication Works

1. **User Login Process:**
   - User enters username or email + password
   - System checks if input is username (no `@`) or email
   - If username: Queries Firestore to find user's email
   - Authenticates with Firebase using email + password
   - Retrieves user data from Firestore
   - Combines with employee data from AsyncStorage (if available)
   - Sets user session in AuthContext

2. **Authentication Methods:**
   - **Username Login**: `testuser` → System finds email → Firebase Auth
   - **Email Login**: `testuser@company.com` → Direct Firebase Auth

3. **Password Storage:**
   - Passwords are **NOT stored in Firestore** (security best practice)
   - Passwords are hashed and stored in **Firebase Authentication**
   - Cannot retrieve original passwords (by design)

---

## User Roles & Permissions

### Role Hierarchy

The system has **3 authentication roles** (not position-based):

#### 1. `super_admin`
**Full System Access**

**Permissions:**
- ✅ Create new users
- ✅ Approve signup requests
- ✅ Manage all employees (all departments)
- ✅ Access all dashboards
- ✅ View all attendance records
- ✅ Assign tickets manually
- ✅ System administration
- ✅ Can manage managers and super admins

**Example Users:**
- `testadmin` (System Administrator)

#### 2. `manager`
**Department-Level Access**

**Permissions:**
- ✅ Manage employees in their department only
- ✅ View attendance records
- ✅ Access HR dashboard
- ✅ Approve leave requests (their department)
- ✅ View tickets assigned to them
- ✅ Cannot manage super admins
- ❌ Cannot create users
- ❌ Cannot approve signups

**Example Users:**
- `hrmanager` (HR Department)
- `techmanager` (Engineering Department)
- `salesmanager` (Sales Department)

**How Managers are Identified:**
- Role: `manager`
- Department: `HR`, `Engineering`, `Sales`, etc.
- Username can be anything (e.g., `hrmanager`, `techmanager`)

#### 3. `employee`
**Basic Access**

**Permissions:**
- ✅ Check in/out
- ✅ View own attendance records
- ✅ Create tickets
- ✅ Request leave/work mode changes
- ✅ View own profile
- ❌ Cannot manage other employees
- ❌ Cannot view other employees' data
- ❌ Cannot access admin dashboards

**Example Users:**
- `testuser`, `john.doe`, `jane.smith`, etc.

### Role vs Position

**Important Distinction:**

- **Role** (`role` field): Authentication/access control
  - Values: `super_admin`, `manager`, `employee`
  - Controls what you can do in the system

- **Position** (`position` field): Job title/description
  - Values: `AI Engineer`, `Senior AI Engineer`, `AI Intern`, `HR Manager`, etc.
  - Descriptive only, does NOT control access
  - Used for HR hierarchy mapping

**Example:**
```json
{
  "username": "techmanager",
  "role": "manager",           // ← Controls access
  "position": "Engineering Manager",  // ← Just a title
  "department": "Engineering"
}
```

---

## Employee Data Structure

### Complete User Object

Every user/employee has the following structure:

```json
{
  "id": "emp_001",                    // Unique employee ID
  "uid": "firebase_auth_uid",         // Firebase Authentication UID
  "username": "testuser",             // Login username (unique)
  "email": "testuser@company.com",    // Email (unique, for Firebase Auth)
  "name": "Test User",                // Full name
  "role": "employee",                 // Auth role: super_admin, manager, employee
  "department": "Engineering",        // Department name
  "position": "AI Engineer",          // Job title/position
  "workMode": "in_office",            // in_office, semi_remote, fully_remote
  "hireDate": "2023-01-15",          // YYYY-MM-DD format
  "isActive": true,                   // Active status
  "createdAt": "2023-01-15T00:00:00.000Z",
  "updatedAt": "2023-01-15T00:00:00.000Z"
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique employee identifier (e.g., `emp_001`) |
| `uid` | string | Yes* | Firebase Auth UID (if using Firebase) |
| `username` | string | Yes | Login username, must be unique |
| `email` | string | Yes | Email address, must be unique, used for Firebase Auth |
| `name` | string | Yes | Full name of the employee |
| `role` | string | Yes | `super_admin`, `manager`, or `employee` |
| `department` | string | No | Department name (e.g., `Engineering`, `HR`, `Sales`) |
| `position` | string | No | Job title (e.g., `AI Engineer`, `HR Manager`) |
| `workMode` | string | No | `in_office`, `semi_remote`, or `fully_remote` |
| `hireDate` | string | No | Date in `YYYY-MM-DD` format |
| `isActive` | boolean | Yes | Whether employee is active |
| `createdAt` | string | Yes | ISO 8601 timestamp |
| `updatedAt` | string | Yes | ISO 8601 timestamp |

---

## Firebase Integration

### What Goes to Firebase?

#### 1. Firebase Authentication
- **Email** (used as login identifier)
- **Password** (hashed, not retrievable)
- **UID** (unique user identifier)

#### 2. Firestore Database (`users` collection)

Each user document contains:

```json
{
  "uid": "firebase_auth_uid",
  "username": "testuser",
  "email": "testuser@company.com",
  "name": "Test User",
  "role": "employee",
  "department": "Engineering",
  "position": "AI Engineer",
  "workMode": "in_office",
  "hireDate": "2023-01-15",
  "isActive": true,
  "createdAt": "2023-01-15T00:00:00.000Z",
  "updatedAt": "2023-01-15T00:00:00.000Z"
}
```

**Document ID:** Firebase Auth UID (not username)

### Firebase Collection Structure

```
Firestore Database
└── users (collection)
    ├── {uid_1} (document)
    │   ├── username: "testuser"
    │   ├── email: "testuser@company.com"
    │   ├── role: "employee"
    │   ├── department: "Engineering"
    │   └── ... (all fields)
    ├── {uid_2} (document)
    └── ...
```

### What Does NOT Go to Firebase?

- ❌ Passwords (stored in Firebase Auth, not Firestore)
- ❌ Attendance records (stored in AsyncStorage)
- ❌ Tickets (stored in AsyncStorage)
- ❌ Notifications (stored in AsyncStorage)
- ❌ Employee list (stored in AsyncStorage, synced with Firebase)

---

## Ticket Routing System

### How Tickets are Routed

When a user creates a ticket:

1. **Category Selection:**
   - User selects category: `Technical`, `HR`, `Finance`, `Facilities`, or `Other`

2. **Super Admin Notification:**
   - All super admins receive notification immediately
   - Ticket is visible to super admins in dashboard

3. **Automatic Department Routing:**
   - System maps category to department:
     - `Technical` → `Engineering` → Finds `techmanager`
     - `HR` → `HR` → Finds `hrmanager`
     - `Finance` → `Finance` → Finds Finance manager (if exists)
     - `Facilities` → `Facilities` → Finds Facilities manager (if exists)
     - `Other` → No auto-assignment (super admin only)

4. **Auto-Assignment:**
   - If department manager exists:
     - Ticket automatically assigned to that manager
     - Status changes from `open` to `in_progress`
     - Manager receives notification
   - If no manager found:
     - Ticket remains unassigned
     - All managers notified about unassigned ticket

### Category to Department Mapping

```javascript
{
  "technical": "Engineering",    // → techmanager
  "hr": "HR",                    // → hrmanager
  "finance": "Finance",          // → Finance manager
  "facilities": "Facilities",    // → Facilities manager
  "other": null                  // → No auto-assignment
}
```

### Ticket Flow Example

**Scenario:** Employee creates a Technical ticket

1. Employee (`testuser`) creates ticket with category `Technical`
2. Super admin (`testadmin`) gets notification
3. System finds `Engineering` department
4. System finds manager with `role: "manager"` AND `department: "Engineering"` → `techmanager`
5. Ticket auto-assigned to `techmanager`
6. `techmanager` receives notification
7. Ticket status: `in_progress`

---

## Data Storage

### Storage Locations

#### 1. Firebase (Cloud)
- **Authentication**: Email/password credentials
- **Firestore `users` collection**: Complete user profile data

#### 2. AsyncStorage (Local Device)
- **Key**: `@company_employees`
- **Data**: Array of employee objects (same structure as Firestore)
- **Purpose**: Local cache, offline access, employee management

#### 3. AsyncStorage (Other Data)
- **Key**: `@attendance_records` - Attendance data
- **Key**: `@tickets` - Ticket data
- **Key**: `@notifications` - Notification data
- **Key**: `@signup_requests` - Pending signup requests

### Data Synchronization

- **Firebase** is the source of truth for user authentication
- **AsyncStorage** employee list is synced with Firebase
- When user is created:
  1. Created in Firebase Authentication
  2. Document created in Firestore `users` collection
  3. Employee added to AsyncStorage `@company_employees`

---

## Login Flow

### Step-by-Step Process

```
1. User enters username/email + password
   ↓
2. Check if input is username or email
   ↓
3. If username → Query Firestore for email
   ↓
4. Authenticate with Firebase (email + password)
   ↓
5. Get Firebase Auth UID
   ↓
6. Fetch user document from Firestore (users/{uid})
   ↓
7. Optionally fetch employee data from AsyncStorage
   ↓
8. Combine data into user object
   ↓
9. Set user in AuthContext
   ↓
10. Navigate to appropriate dashboard:
    - employee → EmployeeDashboard
    - manager/super_admin → AdminDashboard
```

### Code Flow

```javascript
// 1. User enters credentials
authenticateUser(usernameOrEmail, password)

// 2. Check if username or email
if (!usernameOrEmail.includes('@')) {
  // Find email from Firestore
  const userDoc = await getDocs(query(usersRef, where('username', '==', username)));
  email = userDoc.data().email;
}

// 3. Firebase Authentication
const userCredential = await signInWithEmailAndPassword(auth, email, password);

// 4. Get user data from Firestore
const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
const userData = userDoc.data();

// 5. Return user object
return {
  success: true,
  user: {
    username: userData.username,
    role: userData.role,
    uid: userCredential.user.uid,
    email: userCredential.user.email
  }
};
```

---

## Employee Management

### Creating Employees

**Who can create:**
- `super_admin` only

**Process:**
1. Super admin fills form (username, password, name, email, role, department, position, etc.)
2. System checks if username exists
3. Creates user in Firebase Authentication
4. Creates document in Firestore `users` collection
5. Adds employee to AsyncStorage `@company_employees`
6. If role is `manager`, can manage employees in their department

### Updating Employees

**Who can update:**
- `super_admin`: Can update anyone
- `manager`: Can update employees in their department only

**Fields that can be updated:**
- Role (super_admin only)
- Department
- Position
- Work mode
- Hire date
- Active status

### Employee Roles by Department

**Engineering Department:**
- Manager: `techmanager` (role: `manager`)
- Employees: `testuser`, `john.doe`, `david.brown`

**HR Department:**
- Manager: `hrmanager` (role: `manager`)
- Employees: `emily.davis`

**Sales Department:**
- Manager: `salesmanager` (role: `manager`)
- Employees: `mike.johnson`

**Other Departments:**
- Design: `jane.smith`
- Marketing: `sarah.williams`
- Management: `testadmin` (super_admin)

---

## Key Concepts Summary

### 1. Authentication Roles (3 total)
- `super_admin`: Full access
- `manager`: Department-level access
- `employee`: Basic access

### 2. Position vs Role
- **Role**: Controls access (`super_admin`, `manager`, `employee`)
- **Position**: Job title (`AI Engineer`, `HR Manager`, etc.) - descriptive only

### 3. Department-Based Routing
- Managers identified by: `role: "manager"` + `department: "X"`
- Tickets routed to managers based on department
- Managers can only manage employees in their department

### 4. Firebase Structure
- **Authentication**: Email/password (hashed)
- **Firestore**: User profile data (no passwords)
- **Document ID**: Firebase Auth UID

### 5. Data Flow
- Login → Firebase Auth → Firestore → AsyncStorage (optional)
- Create User → Firebase Auth + Firestore + AsyncStorage
- Tickets → AsyncStorage → Auto-route to department manager

---

## Example User Scenarios

### Scenario 1: Employee Login
```
Username: testuser
Password: testuser123
→ Role: employee
→ Department: Engineering
→ Position: AI Engineer
→ Dashboard: EmployeeDashboard
→ Can: Check in/out, view own attendance, create tickets
```

### Scenario 2: Manager Login
```
Username: techmanager
Password: techmanager123
→ Role: manager
→ Department: Engineering
→ Position: Engineering Manager
→ Dashboard: AdminDashboard
→ Can: Manage Engineering employees, view tickets assigned to them
```

### Scenario 3: Super Admin Login
```
Username: testadmin
Password: testadmin123
→ Role: super_admin
→ Department: Management
→ Position: System Administrator
→ Dashboard: AdminDashboard
→ Can: Everything (create users, manage all employees, assign tickets)
```

---

## Migration from users.txt

If migrating from `users.txt` format:

```
Format: username,password:xxx,role:xxx
Example: testuser,password:testuser123,role:employee
```

**Migration Process:**
1. Parse `users.txt` file
2. For each user:
   - Create in Firebase Authentication (email + password)
   - Create document in Firestore `users` collection
   - Add to AsyncStorage `@company_employees`
3. Use migration script: `npm run migrate-users`

---

## Troubleshooting

### Common Issues

**1. "User not found" error:**
- Check if user exists in Firestore `users` collection
- Verify username/email is correct
- Check if user document has all required fields

**2. "Invalid password" error:**
- Password is stored in Firebase Auth (hashed)
- Cannot retrieve original password
- Use Firebase Console to reset password

**3. Ticket not routing to manager:**
- Verify manager exists with correct `role: "manager"`
- Verify manager's `department` matches ticket category mapping
- Check if manager is `isActive: true`

**4. Manager cannot manage employees:**
- Verify manager's `department` matches employee's `department`
- Check if manager's `role` is `"manager"` (not `"employee"`)
- Verify employee is not a `super_admin` (managers can't manage super admins)

---

## Best Practices

1. **Always use Firebase as source of truth** for authentication
2. **Keep AsyncStorage synced** with Firestore for offline access
3. **Use department field** to identify managers, not username
4. **Position is descriptive only** - don't use for access control
5. **Role determines permissions** - always check `role` field for access control
6. **Tickets auto-route** - ensure managers have correct department

---

## File References

### Data Structure Examples
- **User Data Structure**: `users.json`, `asyncStorage-users-example.json`

### Documentation
- **Modular Architecture**: `docs/MODULAR_ARCHITECTURE.md`
- **Firebase Setup**: `docs/FIREBASE_SETUP.md`
- **Deployment Guide**: `docs/DEPLOYMENT.md`
- **Migration Guide**: `docs/MIGRATION_GUIDE.md`

### Code Locations (New Modular Structure)
- **Auth Service**: `features/auth/services/authService.js`
- **Auth Feature**: `features/auth/index.js`
- **Employee Utils**: `utils/employees.js` (legacy, being migrated)
- **Ticket Utils**: `utils/ticketManagement.js` (legacy, being migrated)
- **Core Auth Context**: `core/contexts/AuthContext.js`
- **Core Navigation**: `core/navigation/AppNavigator.js`
- **Shared Constants**: `shared/constants/roles.js`, `shared/constants/workModes.js`

### Scripts
- **Migration Script**: `scripts/migrate-users-to-firebase.mjs`

### Legacy Code (Being Migrated)
- **Legacy Auth**: `utils/auth.js` (use `features/auth` instead)
- **Legacy Screens**: `screens/` (being migrated to feature modules)
- **Legacy Utils**: `utils/` (being migrated to feature modules)

---

*Last Updated: 2025-01-02*

