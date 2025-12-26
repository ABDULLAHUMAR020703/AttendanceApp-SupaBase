# System Architecture & User Management Guide

## Table of Contents
1. [Overview](#overview)
2. [Code Architecture](#code-architecture)
3. [Microservices Architecture](#microservices-architecture)
4. [Authentication System](#authentication-system)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Employee Data Structure](#employee-data-structure)
7. [Firebase Integration](#firebase-integration)
8. [Ticket Routing System](#ticket-routing-system)
9. [Data Storage](#data-storage)
10. [Login Flow](#login-flow)
11. [Employee Management](#employee-management)

---

## Overview

This attendance management system uses **Supabase Authentication** and **PostgreSQL** for user management, with **AsyncStorage** for local data persistence. The system supports three authentication roles with different permission levels and automatic ticket routing based on departments.

The codebase follows a **modular, feature-based architecture** where each feature is self-contained and isolated, ensuring features don't interfere with each other and the code is deployment-ready.

---

## Microservices Architecture

### Overview

The application has been restructured into a **microservices architecture** with a monorepo structure:

```
AttendanceApp/
├── apps/
│   └── mobile/              # React Native Expo app
│
└── services/
    ├── api-gateway/        # API Gateway service (port 3000)
    ├── auth-service/       # Authentication service (port 3001)
    ├── attendance-service/ # Placeholder for attendance service
    ├── leave-service/      # Placeholder for leave service
    └── ticket-service/     # Placeholder for ticket service
```

### API Gateway Service

**Location:** `services/api-gateway/`

**Purpose:** Single entry point for all client requests, routing them to appropriate microservices.

**Features:**
- Express server running on port 3000
- Health check endpoint (`/health`)
- Auth routes that forward requests to auth-service
- CORS enabled for cross-origin requests
- Error handling for service unavailability
- Request timeout handling (10 seconds)

**Endpoints:**
- `GET /health` - Health check
- `POST /api/auth/login` - Forward to auth-service
- `GET /api/auth/check-username/:username` - Forward to auth-service
- `POST /api/auth/users` - Forward to auth-service
- `PATCH /api/auth/users/:username/role` - Forward to auth-service
- `PATCH /api/auth/users/:username` - Forward to auth-service

### Auth Service

**Location:** `services/auth-service/`

**Purpose:** Handles all authentication and user management logic.

**Architecture:**
- **Supabase Client**: Used for all database operations and authentication
- **Service Role Key**: Used for backend operations (bypasses Row Level Security)
- **Supabase Auth**: Handles authentication and password verification

**Why This Approach?**
- Supabase provides unified client for both Auth and Database
- Service Role Key allows backend to perform admin operations
- Supabase Auth handles password verification natively

**Features:**
- Express server running on port 3001
- Firebase Admin SDK integration with service account credentials
- Secure password verification using Firebase Auth REST API
- Complete user management endpoints

**Login Flow:**
1. Accept username/email + password
2. If username: Query Supabase PostgreSQL to get email
3. Authenticate: Use Supabase Auth (`signInWithPassword`)
4. If correct: Query Supabase PostgreSQL to get user data
5. Return user info or authentication error

**Endpoints:**
- `GET /health` - Health check
- `POST /api/auth/login` - User authentication with password verification
- `GET /api/auth/check-username/:username` - Username availability check
- `POST /api/auth/users` - User creation
- `PATCH /api/auth/users/:username/role` - Role updates
- `PATCH /api/auth/users/:username` - User info updates

**Configuration:**
- Supabase credentials via environment variables:
  - `SUPABASE_URL` - Your Supabase project URL
  - `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for backend operations)

**Security:**
- ✅ Passwords verified server-side using Supabase Auth
- ✅ Database access uses Service Role Key (trusted backend, bypasses RLS)
- ✅ No passwords stored or logged
- ✅ Proper error handling for all authentication failures
- ✅ Row Level Security (RLS) policies for frontend access

### Frontend Integration

**Location:** `apps/mobile/`

**API Gateway Configuration:** `apps/mobile/core/config/api.js`

**Login Flow:**
1. Frontend calls API Gateway (`/api/auth/login`)
2. API Gateway forwards to Auth Service
3. Auth Service authenticates via Supabase and returns user data
4. If API Gateway fails: Falls back to direct Supabase authentication (backward compatibility)

**Platform-Aware URL Configuration:**
- **iOS Simulator**: `http://localhost:3000`
- **Android Emulator**: `http://10.0.2.2:3000`
- **Physical Device**: Configured in `app.json` as `http://<your-computer-ip>:3000` (e.g., `http://192.168.18.38:3000`)
- **Configuration**: Set in `apps/mobile/app.json` under `extra.apiGatewayUrl`

### Service Startup

**Windows (PowerShell):**
```powershell
.\start-services.ps1
```

**Linux/macOS (Bash):**
```bash
./start-services.sh
```

**Manual Startup:**
```bash
# Terminal 1: API Gateway
cd services/api-gateway
npm start

# Terminal 2: Auth Service
cd services/auth-service
npm start
```

### Future Services

- **Attendance Service**: Handle attendance tracking and records
- **Leave Service**: Manage leave requests and balances
- **Ticket Service**: Handle support ticket system

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
Self-contained feature modules (PARTIALLY MIGRATED):

**✅ Migrated Features:**
- **`auth/`**: Authentication service and utilities
  - `services/authService.js` - Firebase authentication logic
  - `utils/biometricAuth.js` - Biometric authentication
  - `utils/authPreferences.js` - Auth preferences
  - `index.js` - Public API exports
  - ⚠️ Screens still in `screens/` (LoginScreen, SignUpScreen, AuthenticationScreen, AuthMethodSelection)

- **`calendar/`**: Calendar component
  - `components/DatePickerCalendar.js` - Calendar picker component
  - ⚠️ Screen still in `screens/CalendarScreen.js`

**⏳ Pending Migration (currently in `screens/` and `utils/`):**
- **`attendance/`**: Attendance tracking (screens: EmployeeDashboard, AttendanceHistory, ManualAttendanceScreen)
- **`tickets/`**: Ticket management (screens: TicketScreen, TicketManagementScreen)
- **`leave/`**: Leave request management (screens: LeaveRequestScreen)
- **`employees/`**: Employee management (screens: EmployeeManagement, CreateUserScreen, SignupApprovalScreen)
- **`notifications/`**: Notification system (screens: NotificationsScreen)
- **`analytics/`**: Analytics and dashboards (screens: AdminDashboard, HRDashboard)

**Note**: Most screens and utilities are still in legacy `screens/` and `utils/` directories. Migration is ongoing.

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

#### ✅ New Structure (Use for New Code)
```javascript
// Import from features (migrated)
import { authenticateUser, createUser } from '../features/auth';

// Import from shared
import { ROLES } from '../shared/constants/roles';
import { WORK_MODES } from '../shared/constants/workModes';
import { ROUTES } from '../shared/constants/routes';
import Logo from '../shared/components/Logo';

// Import from core
import { useAuth } from '../core/contexts/AuthContext';
import { useTheme } from '../core/contexts/ThemeContext';
import { storage } from '../core/services/storage';
```

#### ⚠️ Legacy Structure (Currently Used - Will Be Migrated)
```javascript
// Legacy screens (currently used by navigation)
import EmployeeDashboard from '../screens/EmployeeDashboard';
import AttendanceHistory from '../screens/AttendanceHistory';

// Legacy utils (currently used by screens)
import { checkIn, checkOut } from '../utils/auth';
import { getEmployees } from '../utils/employees';
import { createTicket } from '../utils/ticketManagement';
import { submitLeaveRequest } from '../utils/leaveManagement';
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

## Supabase Integration

### Overview

The application uses **Supabase** as the primary backend service for authentication and user data management. Supabase provides secure, scalable PostgreSQL database and authentication capabilities for the attendance management system.

### Supabase Services Used

1. **Supabase Authentication** - User authentication and session management
2. **PostgreSQL Database** - SQL database for user profiles and data
3. **Row Level Security (RLS)** - Database-level access control

### Supabase Configuration

The Supabase configuration is located in `core/config/supabase.js`:

```javascript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Custom AsyncStorage adapter for session persistence
const AsyncStorageAdapter = {
  getItem: async (key) => await AsyncStorage.getItem(key),
  setItem: async (key, value) => await AsyncStorage.setItem(key, value),
  removeItem: async (key) => await AsyncStorage.removeItem(key),
};

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

**Key Features:**
- **AsyncStorage Persistence**: Auth state persists across app restarts via custom adapter
- **PostgreSQL Database**: Relational database with SQL queries
- **Error Handling**: Graceful fallbacks if initialization fails

### Supabase Authentication

#### What is Stored in Supabase Auth?

- **Email**: Used as the primary login identifier
- **Password**: Hashed and encrypted (not retrievable)
- **UID**: Unique user identifier (used as `uid` field in PostgreSQL `users` table)
- **Session State**: Automatically managed by Supabase

#### Authentication Methods Supported

1. **Email/Password Authentication** (Primary)
   - Users can login with email or username
   - If username is provided, system looks up email in PostgreSQL
   - Password is verified by Supabase Authentication

2. **Session Persistence**
   - Uses AsyncStorage for offline persistence via custom adapter
   - Automatically restores session on app restart
   - `onAuthStateChange` listener updates app state

#### Authentication Flow

**Frontend Flow (with API Gateway):**
```javascript
// 1. User enters username or email
authenticateUser(usernameOrEmail, password)

// 2. Try API Gateway first
try {
  const response = await fetch(`${API_GATEWAY_URL}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ usernameOrEmail, password })
  });
  
  if (response.ok) {
    // API Gateway authentication successful
    return response.json();
  }
} catch (error) {
  // Fallback to direct Firebase authentication
}

// 3. Fallback: Direct Supabase authentication
const { data, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password,
});
```

**Backend Flow (Auth Service):**
```javascript
// 1. Accept username/email + password
POST /api/auth/login

// 2. If username, resolve email using Supabase PostgreSQL
if (!usernameOrEmail.includes('@')) {
  const { data: userData } = await supabase
    .from('users')
    .select('email')
    .eq('username', usernameOrEmail)
    .single();
  email = userData.email;
}

// 3. Authenticate using Supabase Auth
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: email,
  password: password,
});

// 4. If password correct, get user data from PostgreSQL
const { data: userData } = await supabase
  .from('users')
  .select('*')
  .eq('uid', authData.user.id)
  .single();

// 5. Return user info
return { success: true, user: userData };
```

#### Authentication Error Handling

The system handles various Supabase Auth errors:

- `Invalid login credentials`: User doesn't exist or wrong password
- `Email not confirmed`: Email needs verification
- `Email rate limit exceeded`: Too many login attempts
- `User already registered`: Email already exists
- `Invalid email address`: Invalid email format

### PostgreSQL Database

#### Table Structure

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid UUID UNIQUE NOT NULL,  -- Supabase Auth UID
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL,  -- 'employee', 'manager', 'super_admin'
  department VARCHAR(255),
  position VARCHAR(255),
  work_mode VARCHAR(50),  -- 'in_office', 'semi_remote', 'fully_remote'
  hire_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Important Notes:**
- **UID Field**: Stores Supabase Auth UID (not the primary key)
- **Username Field**: Unique identifier for login
- **Email Field**: Must match Supabase Auth email
- **Role Field**: Controls access (`super_admin`, `manager`, `employee`)
- **Snake_case**: Database uses snake_case (e.g., `work_mode`, `hire_date`)

#### Row Level Security (RLS)

**RLS Policies:**
- Backend uses Service Role Key (bypasses RLS)
- Frontend uses Anon Key (respects RLS policies)
- Policies control read/write access based on authentication and roles

**Example RLS Policy:**
```sql
-- Allow users to read their own data
CREATE POLICY "Users can read own data"
ON users FOR SELECT
USING (auth.uid() = uid);

-- Allow super_admin to read all
CREATE POLICY "Super admins can read all"
ON users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE uid = auth.uid() AND role = 'super_admin'
  )
);
```

### Supabase API Usage

#### Creating Users

```javascript
// 1. Create in Supabase Auth (using Admin API on backend)
const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
  email: email,
  password: password,
  email_confirm: true,
});

// 2. Create PostgreSQL record
const { data: userData, error: dbError } = await supabase
  .from('users')
  .insert({
    uid: authUser.user.id,
    username: username,
    email: email,
    name: name,
    role: role,
    department: department,
    position: position,
    work_mode: workMode,
    hire_date: hireDate,
    is_active: true,
  })
  .select()
  .single();
```

#### Querying Users

```javascript
// Find user by username
const { data: userData } = await supabase
  .from('users')
  .select('*')
  .eq('username', username)
  .single();

// Get user by UID
const { data: userData } = await supabase
  .from('users')
  .select('*')
  .eq('uid', uid)
  .single();
```

#### Updating Users

```javascript
// Update user role
const { data, error } = await supabase
  .from('users')
  .update({ 
    role: newRole,
    updated_at: new Date().toISOString()
  })
  .eq('username', username)
  .select();

// Update multiple fields
const { data, error } = await supabase
  .from('users')
  .update({
    department: newDepartment,
    position: newPosition,
    work_mode: newWorkMode,
    updated_at: new Date().toISOString()
  })
  .eq('username', username)
  .select();
```

### Supabase Authentication State Management

The app uses `onAuthStateChange` listener to track authentication state:

```javascript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      // User is signed in
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('uid', session.user.id)
        .single();
      setUser(userData);
    } else {
      // User is signed out
      setUser(null);
    }
  });

  return () => subscription.unsubscribe();
}, []);
```

### What Goes to Supabase?

#### ✅ Stored in Supabase

1. **Supabase Authentication**
   - Email addresses
   - Hashed passwords
   - User UIDs
   - Session tokens

2. **PostgreSQL `users` Table**
   - Complete user profiles
   - Username, email, name
   - Role, department, position
   - Work mode, hire date
   - Active status
   - Timestamps

### What Does NOT Go to Supabase?

#### ❌ Stored Locally (AsyncStorage)

- **Attendance Records**: `@attendance_records`
- **Tickets**: `@tickets`
- **Notifications**: `@notifications`
- **Signup Requests**: `@signup_requests`
- **Leave Requests**: `@leave_requests`
- **Employee List Cache**: `@company_employees` (synced from Supabase)

**Why?**
- Attendance and tickets are device-specific
- Notifications are local to each device
- Reduces database read/write costs
- Faster local access

### Supabase Migration

#### From Firebase to Supabase

The app has been fully migrated from Firebase to Supabase:

**Before (Firebase):**
- Firebase Authentication
- Firestore NoSQL database
- Firebase Admin SDK for backend

**After (Current - Supabase):**
- Supabase Authentication
- PostgreSQL SQL database
- Supabase Client for all operations

#### Migration Scripts

User creation scripts available:
- **`scripts/create-users-supabase.js`** - Programmatically create users via Supabase Admin API
- **`migrations/manual-create-users.sql`** - SQL script for manual user creation

### Supabase Best Practices

1. **Security**
   - Use Row Level Security (RLS) policies in production
   - Never expose Service Role Key in client code (use environment variables)
   - Implement proper role-based access control
   - Use Anon Key for frontend, Service Role Key for backend only

2. **Performance**
   - Use PostgreSQL indexes for frequently queried fields
   - Cache frequently accessed data in AsyncStorage
   - Implement pagination for large datasets
   - Use `.select()` to limit returned fields

3. **Error Handling**
   - Always handle Supabase errors gracefully
   - Check both `data` and `error` in responses
   - Provide user-friendly error messages
   - Log errors for debugging

4. **Offline Support**
   - Supabase Auth persists via AsyncStorage adapter
   - AsyncStorage provides additional offline storage
   - Implement local caching for offline access

### Supabase Troubleshooting

#### Common Issues

**1. "Missing or insufficient permissions"**
- Check Row Level Security (RLS) policies
- Verify policies are enabled on the table
- Ensure user is authenticated
- Check if Service Role Key is needed for backend operations

**2. "Supabase client not initialized"**
- Check `core/config/supabase.js` initialization
- Verify environment variables are set
- Ensure Supabase URL and keys are correct

**3. "User not found"**
- Check if user exists in Supabase Authentication
- Verify PostgreSQL `users` table has matching record
- Check `uid` field matches Supabase Auth UID
- Verify username field matches

**4. Authentication not persisting**
- Verify AsyncStorage is working
- Check AsyncStorage adapter is configured correctly
- Ensure app has storage permissions
- Verify `autoRefreshToken` and `persistSession` are enabled

### Supabase Setup Reference

For complete setup instructions, see:
- **`SETUP.md`** - Step-by-step Supabase setup guide
- **`core/config/supabase.js`** - Supabase configuration file
- **`services/auth-service/config/supabase.js`** - Backend Supabase configuration
- **`apps/mobile/utils/auth.js`** - Authentication service implementation

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

### Architecture Overview

The login flow now uses a **microservices architecture** with API Gateway and Auth Service. The frontend first attempts to authenticate via the API Gateway, with a fallback to direct Firebase authentication for backward compatibility.

### Step-by-Step Process (Microservices Architecture)

```
1. User enters username/email + password (Frontend)
   ↓
2. Frontend calls API Gateway: POST /api/auth/login
   ↓
3. API Gateway forwards to Auth Service: POST /api/auth/login
   ↓
4. Auth Service:
   a. If username → Query Firestore using Admin SDK → Get email
   b. Verify password using Firebase Auth REST API
   c. If correct → Get user data using Admin SDK
   d. Return user object
   ↓
5. API Gateway returns response to Frontend
   ↓
6. If API Gateway fails → Fallback to direct Firebase authentication
   ↓
7. Set user in AuthContext
   ↓
8. Navigate to appropriate dashboard:
    - employee → EmployeeDashboard
    - manager/super_admin → AdminDashboard
```

### Frontend Login Flow

**Location:** `apps/mobile/utils/auth.js`

**Flow:**
1. User enters username/email + password
2. Frontend calls API Gateway (`/api/auth/login`) with 10-second timeout
3. If API Gateway succeeds → Use response
4. If API Gateway fails (network error, timeout, service unavailable) → Fallback to direct Firebase authentication
5. Maintains backward compatibility

**Code:**
```javascript
// Try API Gateway first
try {
  const response = await fetch(`${API_GATEWAY_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernameOrEmail, password }),
    signal: controller.signal, // 10-second timeout
  });
  
  if (response.ok) {
    return await response.json(); // API Gateway success
  }
} catch (error) {
  // Fallback to Firebase authentication
}

// Fallback: Direct Firebase authentication
const userCredential = await signInWithEmailAndPassword(auth, email, password);
```

### Backend Login Flow (Auth Service)

**Location:** `services/auth-service/routes/auth.js`

**Flow:**
1. Accept username/email + password
2. **If username**: Use Admin SDK to query Firestore → Get email
3. **Verify password**: Use Firebase Auth REST API (`signInWithPassword`)
4. **If password correct**: Use Admin SDK to get user data from Firestore
5. Return user info or authentication error

**Why Hybrid Approach?**
- Firebase Admin SDK **cannot verify passwords directly**
- Admin SDK is used for Firestore operations (trusted backend)
- REST API is used ONLY for password verification

**Code:**
```javascript
// 1. If username, resolve email using Admin SDK
if (!usernameOrEmail.includes('@')) {
  const querySnapshot = await db.collection('users')
    .where('username', '==', usernameOrEmail)
    .limit(1)
    .get();
  email = querySnapshot.docs[0].data().email;
}

// 2. Verify password using Firebase Auth REST API
const authResponse = await axios.post(
  'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword',
  { email, password, returnSecureToken: true }
);

// 3. Get user data using Admin SDK
const userDoc = await db.collection('users').doc(localId).get();
const userData = userDoc.data();

// 4. Return user info
return { success: true, user: userData };
```

### Username vs Email Login

**Username Login:**
1. Frontend sends username to API Gateway
2. Auth Service queries PostgreSQL by `username` field using Supabase
3. Gets email from PostgreSQL record
4. Authenticates using Supabase Auth
5. Returns user data from PostgreSQL

**Email Login:**
1. Frontend sends email to API Gateway
2. Auth Service uses email directly
3. Authenticates using Supabase Auth
4. Returns user data from PostgreSQL

**Key Differences:**
- Username login requires PostgreSQL query BEFORE password verification
- Email login skips PostgreSQL query (uses email directly)
- Both use Supabase Auth for password verification
- Both use Service Role Key for database access (trusted backend, bypasses RLS)
- No RLS restrictions (Service Role Key bypasses policies)

### Security Features

**✅ Secure Password Verification:**
- Passwords verified server-side using Supabase Auth
- No passwords stored or logged
- Proper error handling for authentication failures

**✅ Trusted Backend:**
- Service Role Key used for PostgreSQL operations
- Admin privileges for database access
- Bypasses Row Level Security (RLS) policies

**✅ Error Handling:**
- Invalid username/email → 401
- Invalid password → 401
- User disabled → 403
- Too many attempts → 429
- Network errors → 503 (service unavailable)

### Fallback Authentication

If the API Gateway is unavailable, the frontend automatically falls back to direct Supabase authentication:

```javascript
// Fallback: Direct Supabase authentication
try {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });
  // ... get user data from PostgreSQL
} catch (error) {
  // Handle authentication error
}
```

This ensures the app continues to work even if microservices are down.

---

## Employee Management

### Creating Employees

**Who can create:**
- `super_admin` only

**Process:**
1. Super admin fills form (username, password, name, email, role, department, position, etc.)
2. System checks if username exists
3. Creates user in Supabase Authentication (via Admin API)
4. Creates record in PostgreSQL `users` table
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

### 4. Supabase Structure
- **Authentication**: Email/password (hashed, stored in Supabase Auth)
- **PostgreSQL**: User profile data (no passwords, `uid` field = Supabase Auth UID)
- **Configuration**: `core/config/supabase.js` (frontend), `services/auth-service/config/supabase.js` (backend)
- **Initialization**: AsyncStorage persistence via custom adapter
- **Security**: Row Level Security (RLS) policies for role-based access

### 5. Data Flow
- Login → Supabase Auth → PostgreSQL → AsyncStorage (optional)
- Create User → Supabase Auth + PostgreSQL + AsyncStorage
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
1. Parse `users.txt` file (if migrating from legacy format)
2. For each user:
   - Create in Supabase Authentication (email + password)
   - Create record in PostgreSQL `users` table
   - Add to AsyncStorage `@company_employees`
3. Use migration script: `scripts/create-users-supabase.js` or SQL script: `migrations/manual-create-users.sql`

---

## Troubleshooting

### Common Issues

**1. "Missing or insufficient permissions" error:**
- **Cause**: Row Level Security (RLS) policies are blocking access
- **For Username Login**: Policies must allow queries before authentication
- **For Email Login**: Policies must allow authenticated users to read their own data
- **Solution**: Update RLS policies or use Service Role Key for backend operations
- See `SETUP.md` for complete RLS policy setup

**2. "User not found" error:**
- **For Username Login**: User doesn't exist in PostgreSQL `users` table
- **For Email Login**: User exists in Supabase Auth but PostgreSQL record is missing
- **Solution**: 
  - Check if user exists in both Supabase Authentication AND PostgreSQL
  - Run migration script if database is empty: `scripts/create-users-supabase.js`
  - Users must exist in BOTH places for login to work

**3. "User data not found" error:**
- **Cause**: User authenticated successfully in Supabase Auth, but PostgreSQL record doesn't exist
- **Solution**: Create the PostgreSQL record with the user's UID in the `uid` field
- This happens when users are created in Supabase Auth but not in PostgreSQL

**4. "Invalid password" error:**
- Password is stored in Supabase Auth (hashed)
- Cannot retrieve original password
- Use Supabase Dashboard to reset password

**5. Empty PostgreSQL Database:**
- **Username Login**: Will fail immediately with "Invalid username or password"
- **Email Login**: Will authenticate in Supabase Auth, but fail when reading PostgreSQL with "User data not found"
- **Solution**: Populate database using migration script or create users through the app

**6. Ticket not routing to manager:**
- Verify manager exists with correct `role: "manager"`
- Verify manager's `department` matches ticket category mapping
- Check if manager is `isActive: true`

**7. Manager cannot manage employees:**
- Verify manager's `department` matches employee's `department`
- Check if manager's `role` is `"manager"` (not `"employee"`)
- Verify employee is not a `super_admin` (managers can't manage super admins)

---

## Best Practices

1. **Always use Supabase as source of truth** for authentication
2. **Keep AsyncStorage synced** with PostgreSQL for offline access
3. **Use department field** to identify managers, not username
4. **Position is descriptive only** - don't use for access control
5. **Role determines permissions** - always check `role` field for access control
6. **Tickets auto-route** - ensure managers have correct department
7. **Use Service Role Key** only on backend, never expose in frontend

---

## File References

### Data Structure Examples
- **User Data Structure**: `users.json`, `asyncStorage-users-example.json`

### Documentation
- **Modular Architecture**: `docs/MODULAR_ARCHITECTURE.md`
- **Firebase Setup**: `docs/FIREBASE_SETUP.md`
- **Deployment Guide**: `docs/DEPLOYMENT.md`
- **Migration Guide**: `docs/MIGRATION_GUIDE.md`

### Code Locations (Current Structure)

#### ✅ New Modular Structure (Migrated)
- **Auth Service**: `features/auth/services/authService.js`
- **Auth Feature**: `features/auth/index.js`
- **Auth Utils**: `features/auth/utils/biometricAuth.js`, `features/auth/utils/authPreferences.js`
- **Calendar Component**: `features/calendar/components/DatePickerCalendar.js`
- **Core Auth Context**: `core/contexts/AuthContext.js`
- **Core Theme Context**: `core/contexts/ThemeContext.js`
- **Core Navigation**: `core/navigation/AppNavigator.js`, `core/navigation/MainNavigator.js`, `core/navigation/AuthNavigator.js`
- **Core Storage**: `core/services/storage.js`
- **Core Supabase Config**: `core/config/supabase.js` (frontend)
- **Backend Supabase Config**: `services/auth-service/config/supabase.js` (backend)
- **Shared Constants**: `shared/constants/roles.js`, `shared/constants/workModes.js`, `shared/constants/routes.js`
- **Shared Components**: `shared/components/Logo.js`, `shared/components/Trademark.js`, `shared/components/CustomDrawer.js`
- **Shared Utils**: `shared/utils/responsive.js`

#### ⚠️ Legacy Code (Currently in Use - Being Migrated)
- **Legacy Auth Utils**: `utils/auth.js` (use `features/auth` instead)
- **Legacy Employee Utils**: `utils/employees.js` (to be migrated to `features/employees/`)
- **Legacy Ticket Utils**: `utils/ticketManagement.js` (to be migrated to `features/tickets/`)
- **Legacy Leave Utils**: `utils/leaveManagement.js` (to be migrated to `features/leave/`)
- **Legacy Notification Utils**: `utils/notifications.js` (to be migrated to `features/notifications/`)
- **Legacy Analytics Utils**: `utils/analytics.js` (to be migrated to `features/analytics/`)
- **Legacy Calendar Utils**: `utils/calendar.js` (to be migrated to `features/calendar/`)
- **Legacy Location Utils**: `utils/location.js` (to be migrated to `features/attendance/utils/`)
- **Legacy Storage**: `utils/storage.js` (use `core/services/storage.js` instead)
- **Legacy Responsive**: `utils/responsive.js` (use `shared/utils/responsive.js` instead)
- **Legacy Screens**: All 18 screens in `screens/` directory (to be migrated to respective feature modules)

### Scripts
- **Migration Script**: `scripts/migrate-users-to-firebase.mjs`

---

---

## Firebase Quick Reference

### Configuration Files
- **Frontend**: `core/config/supabase.js` - Exports `supabase`, `supabaseUrl`
- **Backend**: `services/auth-service/config/supabase.js` - Exports `supabase` (with Service Role Key)

### Authentication Service
- **Location**: `apps/mobile/utils/auth.js` (frontend), `services/auth-service/routes/auth.js` (backend)
- **Functions**: `authenticateUser`, `createUser`, `updateUserRole`, `updateUserInfo`, `checkUsernameExists`

### PostgreSQL Tables
- **`users`**: User profiles (`uid` field = Supabase Auth UID)

### Supabase Services
- **Authentication**: Email/password with AsyncStorage persistence via custom adapter
- **PostgreSQL**: SQL database with Supabase client
- **Error Handling**: Comprehensive error codes and messages

### Migration
- **Script**: `scripts/create-users-supabase.js` - Programmatic user creation
- **SQL Script**: `migrations/manual-create-users.sql` - Manual SQL user creation
- **Source**: Create users directly in Supabase Auth + PostgreSQL

For detailed Supabase setup, see `SETUP.md`.

---

## Current Implementation Status

### What's Actually Implemented

**Core Infrastructure (✅ Complete)**
- Firebase configuration and initialization
- Auth and Theme contexts
- Navigation structure (AppNavigator, AuthNavigator, MainNavigator)
- Storage abstraction service

**Shared Code (✅ Complete)**
- Constants (roles, work modes, routes)
- Shared components (Logo, Trademark, CustomDrawer)
- Shared utilities (responsive)

**Features (🔄 Partial Migration)**
- ✅ `features/auth/` - Service and utilities migrated, screens still in `screens/`
- ✅ `features/calendar/` - Component migrated, screen still in `screens/`
- ⏳ All other features - Screens and utils still in legacy directories

**Legacy Code (⚠️ Currently in Use)**
- 18 screens in `screens/` directory
- 17 utility files in `utils/` directory
- 4 components in `components/` directory (some duplicated in `shared/components/`)

**Navigation**
- Currently imports all screens from `screens/` directory
- Uses legacy paths: `import EmployeeDashboard from '../../screens/EmployeeDashboard'`

**App Entry Point**
- `App.js` still imports from `utils/employees` (legacy)
- Uses core contexts and navigation (new structure)

### Migration Progress

- **Phase 1**: ✅ Create new structure (COMPLETED)
- **Phase 2**: 🔄 Migrate features (IN PROGRESS - 2 features partially migrated)
- **Phase 3**: ⏳ Update imports (PENDING)
- **Phase 4**: ⏳ Remove legacy code (PENDING)

### Next Steps for Migration

1. Migrate remaining features to `features/` directory structure
2. Move screens from `screens/` to respective feature modules
3. Move utilities from `utils/` to respective feature modules
4. Create `index.js` files for all feature modules
5. Update navigation to import from feature modules
6. Update `App.js` to use feature modules
7. Remove legacy code after migration is complete

---

---

## CI/CD Pipeline

### GitHub Actions Workflow

**Location:** `.github/workflows/deploy.yml`

**Triggers:**
- Push to `master` or `main` branches
- Pull requests to `master` or `main` branches

**Workflow Steps:**

1. **Checkout Code**
   - Uses `actions/checkout@v3`

2. **Setup Node.js**
   - Uses `actions/setup-node@v4`
   - Node.js version: 18
   - Enables npm caching
   - Cache dependency path: `apps/mobile/package-lock.json`

3. **Verify npm Version**
   - Displays npm version for debugging

4. **Validate package-lock.json**
   - Validates JSON structure
   - Removes corrupted lockfile if invalid
   - Prevents npm ci failures

5. **Install Dependencies**
   - Attempts `npm ci` first (faster, more reliable)
   - Falls back to `npm install` if `npm ci` fails
   - Automatically regenerates lockfile if needed

6. **Run Linter** (Optional)
   - Runs `npm run lint` with graceful failure

7. **Check Code Formatting** (Optional)
   - Runs `npm run format:check` with graceful failure

8. **Build Android**
   - Runs `npm run android:build`
   - Environment: `EXPO_PUBLIC_ENV=production`
   - Graceful failure if build skipped

9. **Build iOS**
   - Runs `npm run ios:build`
   - Environment: `EXPO_PUBLIC_ENV=production`
   - Graceful failure if build skipped

**Key Features:**
- ✅ Package-lock.json validation and auto-recovery
- ✅ Fallback mechanisms for dependency installation
- ✅ Environment variable support
- ✅ Multi-platform build support
- ✅ Graceful error handling

**Troubleshooting:**
- If `npm ci` fails with "Invalid Version" error, workflow automatically regenerates lockfile
- Build steps are optional and won't fail the entire workflow
- All steps include proper error handling

---

*Last Updated: 2025-12-26*

