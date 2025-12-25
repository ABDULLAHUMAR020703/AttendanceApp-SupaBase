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

This attendance management system uses **Firebase Authentication** and **Firestore** for user management, with **AsyncStorage** for local data persistence. The system supports three authentication roles with different permission levels and automatic ticket routing based on departments.

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
- **Firebase Admin SDK**: Used for Firestore operations (trusted backend with admin privileges)
- **Firebase Auth REST API**: Used ONLY for password verification (Admin SDK limitation)

**Why Hybrid Approach?**
- Firebase Admin SDK **cannot verify passwords directly**
- Admin SDK is used for Firestore access (username lookup, user data retrieval)
- REST API is used for password verification (only operation Admin SDK cannot do)

**Features:**
- Express server running on port 3001
- Firebase Admin SDK integration with service account credentials
- Secure password verification using Firebase Auth REST API
- Complete user management endpoints

**Login Flow:**
1. Accept username/email + password
2. If username: Use Admin SDK to query Firestore and get email
3. Verify password: Use Firebase Auth REST API (`signInWithPassword`)
4. If correct: Use Admin SDK to get user data from Firestore
5. Return user info or authentication error

**Endpoints:**
- `GET /health` - Health check
- `POST /api/auth/login` - User authentication with password verification
- `GET /api/auth/check-username/:username` - Username availability check
- `POST /api/auth/users` - User creation
- `PATCH /api/auth/users/:username/role` - Role updates
- `PATCH /api/auth/users/:username` - User info updates

**Configuration:**
- Service account credentials via environment variables:
  - `GOOGLE_APPLICATION_CREDENTIALS` (path to JSON file), OR
  - `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY` + `GOOGLE_PROJECT_ID`
- Firebase API key for REST API password verification

**Security:**
- ✅ Passwords verified server-side using Firebase Auth REST API
- ✅ Firestore access uses Admin SDK (trusted backend)
- ✅ No passwords stored or logged
- ✅ Proper error handling for all authentication failures

### Frontend Integration

**Location:** `apps/mobile/`

**API Gateway Configuration:** `apps/mobile/core/config/api.js`

**Login Flow:**
1. Frontend calls API Gateway (`/api/auth/login`)
2. API Gateway forwards to Auth Service
3. Auth Service verifies password and returns user data
4. If API Gateway fails: Falls back to direct Firebase authentication (backward compatibility)

**Platform-Aware URL Configuration:**
- **iOS Simulator**: `http://localhost:3000`
- **Android Emulator**: `http://10.0.2.2:3000` or uses `debuggerHost`
- **Physical Device**: Uses computer's IP address (must be on same network)

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

## Firebase Integration

### Overview

The application uses **Firebase** as the primary backend service for authentication and user data management. Firebase provides secure, scalable, and real-time capabilities for the attendance management system.

### Firebase Services Used

1. **Firebase Authentication** - User authentication and session management
2. **Cloud Firestore** - NoSQL database for user profiles and data
3. **Firebase Configuration** - Centralized app configuration

### Firebase Configuration

The Firebase configuration is located in `core/config/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID" // Optional
};
```

### Firebase Initialization

The app initializes Firebase with React Native-specific settings:

```javascript
// Initialize Firebase App
app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage persistence
auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore with React Native compatibility
db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});
```

**Key Features:**
- **AsyncStorage Persistence**: Auth state persists across app restarts
- **Long Polling**: Ensures Firestore works reliably in React Native
- **Error Handling**: Graceful fallbacks if initialization fails

### Firebase Authentication

#### What is Stored in Firebase Auth?

- **Email**: Used as the primary login identifier
- **Password**: Hashed and encrypted (not retrievable)
- **UID**: Unique user identifier (used as Firestore document ID)
- **Session State**: Automatically managed by Firebase

#### Authentication Methods Supported

1. **Email/Password Authentication** (Primary)
   - Users can login with email or username
   - If username is provided, system looks up email in Firestore
   - Password is verified by Firebase Authentication

2. **Session Persistence**
   - Uses AsyncStorage for offline persistence
   - Automatically restores session on app restart
   - `onAuthStateChanged` listener updates app state

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

// 3. Fallback: Direct Firebase authentication
const userCredential = await signInWithEmailAndPassword(auth, email, password);
```

**Backend Flow (Auth Service):**
```javascript
// 1. Accept username/email + password
POST /api/auth/login

// 2. If username, resolve email using Admin SDK + Firestore
if (!usernameOrEmail.includes('@')) {
  const querySnapshot = await db.collection('users')
    .where('username', '==', usernameOrEmail)
    .limit(1)
    .get();
  email = querySnapshot.docs[0].data().email;
}

// 3. Verify password using Firebase Auth REST API
const authResponse = await axios.post(
  'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword',
  { email, password, returnSecureToken: true }
);

// 4. If password correct, get user data using Admin SDK
const userDoc = await db.collection('users').doc(localId).get();
const userData = userDoc.data();

// 5. Return user info
return { success: true, user: userData };
```

#### Authentication Error Handling

The system handles various Firebase Auth errors:

- `auth/user-not-found`: User doesn't exist
- `auth/wrong-password`: Incorrect password
- `auth/invalid-email`: Invalid email format
- `auth/user-disabled`: Account disabled
- `auth/too-many-requests`: Rate limiting
- `auth/email-already-in-use`: Email already registered
- `auth/weak-password`: Password too weak

### Firestore Database

#### Collection Structure

```
Firestore Database
└── users (collection)
    ├── {uid_1} (document)
    │   ├── uid: "firebase_auth_uid"
    │   ├── username: "testuser"
    │   ├── email: "testuser@company.com"
    │   ├── name: "Test User"
    │   ├── role: "employee"
    │   ├── department: "Engineering"
    │   ├── position: "AI Engineer"
    │   ├── workMode: "in_office"
    │   ├── hireDate: "2023-01-15"
    │   ├── isActive: true
    │   ├── createdAt: "2023-01-15T00:00:00.000Z"
    │   └── updatedAt: "2023-01-15T00:00:00.000Z"
    ├── {uid_2} (document)
    └── ...
```

**Important Notes:**
- **Document ID**: Always the Firebase Auth UID (not username)
- **Username Field**: Stored as a field for querying
- **Email Field**: Must match Firebase Auth email
- **Role Field**: Controls access (`super_admin`, `manager`, `employee`)

#### Firestore Security Rules

**Development Rules (Permissive):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Allow authenticated users to read
      allow read: if request.auth != null;
      
      // Allow queries for username lookup (needed for username-based login)
      allow list: if true;
      
      // Allow authenticated users to write
      allow write: if request.auth != null;
    }
  }
}
```

**Production Rules (Recommended - with username login support):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Allow authenticated users to read their own data
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Allow super_admin to read all
      allow read: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin';
      
      // Allow queries for username lookup (needed for username-based login before authentication)
      // This allows the app to query users by username to find their email
      allow list: if true;
      
      // Only super_admin and managers can write
      allow write: if request.auth != null && 
                      (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin' ||
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'manager');
    }
  }
}
```

**Important Notes:**
- The `allow list: if true;` rule is required for username-based login, as the app queries Firestore by username before authentication
- Without this rule, username login will fail with "Missing or insufficient permissions"
- Email login works differently: it authenticates first, then reads Firestore (which requires `allow read` for authenticated users)

### Firebase API Usage

#### Creating Users

```javascript
// 1. Create in Firebase Authentication
const userCredential = await createUserWithEmailAndPassword(
  auth, 
  email, 
  password
);

// 2. Create Firestore document
await setDoc(doc(db, 'users', userCredential.user.uid), {
  uid: userCredential.user.uid,
  username,
  email,
  name,
  role,
  department,
  position,
  workMode,
  hireDate,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});
```

#### Querying Users

```javascript
// Find user by username
const usersRef = collection(db, 'users');
const q = query(usersRef, where('username', '==', username));
const querySnapshot = await getDocs(q);

// Get user by UID
const userDoc = await getDoc(doc(db, 'users', uid));
const userData = userDoc.data();
```

#### Updating Users

```javascript
// Update user role
await setDoc(doc(db, 'users', userId), {
  role: newRole,
  updatedAt: new Date().toISOString()
}, { merge: true });

// Update multiple fields
await setDoc(doc(db, 'users', userId), {
  department: newDepartment,
  position: newPosition,
  workMode: newWorkMode,
  updatedAt: new Date().toISOString()
}, { merge: true });
```

### Firebase Authentication State Management

The app uses `onAuthStateChanged` listener to track authentication state:

```javascript
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // User is signed in
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      const userData = userDoc.data();
      setUser(combinedUser);
    } else {
      // User is signed out
      setUser(null);
    }
  });

  return () => unsubscribe();
}, []);
```

### What Goes to Firebase?

#### ✅ Stored in Firebase

1. **Firebase Authentication**
   - Email addresses
   - Hashed passwords
   - User UIDs
   - Session tokens

2. **Firestore `users` Collection**
   - Complete user profiles
   - Username, email, name
   - Role, department, position
   - Work mode, hire date
   - Active status
   - Timestamps

### What Does NOT Go to Firebase?

#### ❌ Stored Locally (AsyncStorage)

- **Attendance Records**: `@attendance_records`
- **Tickets**: `@tickets`
- **Notifications**: `@notifications`
- **Signup Requests**: `@signup_requests`
- **Leave Requests**: `@leave_requests`
- **Employee List Cache**: `@company_employees` (synced from Firebase)

**Why?**
- Attendance and tickets are device-specific
- Notifications are local to each device
- Reduces Firebase read/write costs
- Faster local access

### Firebase Migration

#### From Local Storage to Firebase

The app has been fully migrated from local file storage:

**Before (Legacy):**
- `users.txt` file in device storage
- FileSystem operations
- Manual file parsing

**After (Current):**
- Firebase Authentication for credentials
- Firestore for user data
- Automatic sync across devices
- Built-in offline support

#### Migration Script

Use `scripts/migrate-users-to-firebase.mjs` to migrate from `users.txt`:

```bash
npm run migrate-users
```

The script:
1. Reads `users.txt` from project root
2. Parses user data
3. Creates Firebase Auth accounts
4. Creates Firestore documents
5. Includes all user fields

### Firebase Best Practices

1. **Security**
   - Use production security rules in production
   - Never expose API keys in client code (use environment variables)
   - Implement proper role-based access control

2. **Performance**
   - Use Firestore queries efficiently
   - Cache frequently accessed data in AsyncStorage
   - Implement pagination for large datasets

3. **Error Handling**
   - Always handle Firebase errors gracefully
   - Provide user-friendly error messages
   - Log errors for debugging

4. **Offline Support**
   - Firebase Auth persists automatically
   - Firestore has built-in offline cache
   - AsyncStorage provides additional offline storage

### Firebase Troubleshooting

#### Common Issues

**1. "Missing or insufficient permissions"**
- Check Firestore security rules
- Verify rules are published
- Ensure user is authenticated

**2. "Firebase: No Firebase App '[DEFAULT]' has been created"**
- Check `core/config/firebase.js` initialization
- Ensure `initializeApp()` is called before other services
- Verify Firebase configuration is correct

**3. "User not found"**
- Check if user exists in Firebase Authentication
- Verify Firestore document exists
- Check username field matches

**4. Authentication not persisting**
- Verify AsyncStorage is working
- Check `getReactNativePersistence` is used
- Ensure app has storage permissions

### Firebase Setup Reference

For complete setup instructions, see:
- **`docs/FIREBASE_SETUP.md`** - Step-by-step Firebase setup guide
- **`core/config/firebase.js`** - Firebase configuration file
- **`features/auth/services/authService.js`** - Authentication service implementation

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
2. Auth Service queries Firestore by `username` field using Admin SDK
3. Gets email from Firestore document
4. Verifies password using Firebase Auth REST API
5. Returns user data from Firestore

**Email Login:**
1. Frontend sends email to API Gateway
2. Auth Service uses email directly
3. Verifies password using Firebase Auth REST API
4. Returns user data from Firestore

**Key Differences:**
- Username login requires Firestore query BEFORE password verification
- Email login skips Firestore query (uses email directly)
- Both use Firebase Auth REST API for password verification
- Both use Admin SDK for Firestore access (trusted backend)
- No security rules restrictions (Admin SDK bypasses rules)

### Security Features

**✅ Secure Password Verification:**
- Passwords verified server-side using Firebase Auth REST API
- No passwords stored or logged
- Proper error handling for authentication failures

**✅ Trusted Backend:**
- Admin SDK used for Firestore operations
- Admin privileges for database access
- No security rules restrictions

**✅ Error Handling:**
- Invalid username/email → 401
- Invalid password → 401
- User disabled → 403
- Too many attempts → 429
- Network errors → 503 (service unavailable)

### Fallback Authentication

If the API Gateway is unavailable, the frontend automatically falls back to direct Firebase authentication:

```javascript
// Fallback: Direct Firebase authentication
try {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  // ... get user data from Firestore
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
- **Authentication**: Email/password (hashed, stored in Firebase Auth)
- **Firestore**: User profile data (no passwords, document ID = Firebase Auth UID)
- **Configuration**: `core/config/firebase.js`
- **Initialization**: AsyncStorage persistence, long polling for React Native
- **Security**: Firestore security rules for role-based access

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

**1. "Missing or insufficient permissions" error:**
- **Cause**: Firestore security rules are blocking access
- **For Username Login**: Rules must allow queries (`allow list`) before authentication
- **For Email Login**: Rules must allow authenticated users to read their own document
- **Solution**: Update Firestore security rules to include `allow list: if true;` and proper read permissions
- See `docs/FIREBASE_SETUP.md` for complete security rules

**2. "User not found" error:**
- **For Username Login**: User doesn't exist in Firestore `users` collection
- **For Email Login**: User exists in Firebase Auth but Firestore document is missing
- **Solution**: 
  - Check if user exists in both Firebase Authentication AND Firestore
  - Run migration script if Firestore is empty: `npm run migrate-users`
  - Users must exist in BOTH places for login to work

**3. "User data not found" error:**
- **Cause**: User authenticated successfully in Firebase Auth, but Firestore document doesn't exist
- **Solution**: Create the Firestore document with the user's UID as document ID
- This happens when users are created in Firebase Auth but not in Firestore

**4. "Invalid password" error:**
- Password is stored in Firebase Auth (hashed)
- Cannot retrieve original password
- Use Firebase Console to reset password

**5. Empty Firestore Database:**
- **Username Login**: Will fail immediately with "Invalid username or password"
- **Email Login**: Will authenticate in Firebase Auth, but fail when reading Firestore with "User data not found"
- **Solution**: Populate Firestore using migration script or create users through the app

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
- **Core Firebase Config**: `core/config/firebase.js`
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

### Configuration File
- **Location**: `core/config/firebase.js`
- **Exports**: `auth`, `db`, `app`

### Authentication Service
- **Location**: `features/auth/services/authService.js`
- **Functions**: `authenticateUser`, `createUser`, `updateUserRole`, `updateUserInfo`, `checkUsernameExists`

### Firestore Collections
- **`users`**: User profiles (document ID = Firebase Auth UID)

### Firebase Services
- **Authentication**: Email/password with AsyncStorage persistence
- **Firestore**: NoSQL database with React Native long polling
- **Error Handling**: Comprehensive error codes and messages

### Migration
- **Script**: `scripts/migrate-users-to-firebase.mjs`
- **Command**: `npm run migrate-users`
- **Source**: `users.txt` → Firebase Auth + Firestore

For detailed Firebase setup, see `docs/FIREBASE_SETUP.md`.

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

*Last Updated: 2025-12-16*

