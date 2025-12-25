# Technical Documentation

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Microservices Architecture](#microservices-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Backend Services](#backend-services)
7. [Database & Storage](#database--storage)
8. [Authentication & Security](#authentication--security)
9. [API Documentation](#api-documentation)
10. [Development Setup](#development-setup)
11. [Build & Deployment](#build--deployment)
12. [CI/CD Pipeline](#cicd-pipeline)
13. [Testing](#testing)
14. [Performance Optimization](#performance-optimization)
15. [Security Best Practices](#security-best-practices)
16. [Troubleshooting](#troubleshooting)
17. [Code Standards](#code-standards)

---

## Overview

**Present** is a comprehensive employee attendance management system built with modern web technologies. The application follows a microservices architecture with a React Native mobile frontend and Node.js backend services.

### Key Technical Highlights

- **Monorepo Structure**: Organized into apps and services
- **Microservices**: API Gateway pattern with service-oriented architecture
- **Cross-Platform**: React Native with Expo for iOS and Android
- **Cloud Backend**: Firebase Authentication and Firestore
- **CI/CD**: Automated builds and deployments via GitHub Actions
- **Modular Architecture**: Feature-based code organization

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.81.5 | Mobile framework |
| React | 19.1.0 | UI library |
| Expo SDK | ~54.0.25 | Development platform |
| React Navigation | 6.x | Navigation library |
| NativeWind | ^2.0.11 | Tailwind CSS for React Native |
| Tailwind CSS | 3.3.2 | Utility-first CSS |

### Backend Services

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime environment |
| Express | ^5.2.1 | Web framework |
| Firebase Admin SDK | ^13.6.0 | Backend Firebase operations |
| Axios | ^1.13.2 | HTTP client |
| CORS | ^2.8.5 | Cross-origin resource sharing |

### Core Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| Firebase | ^12.6.0 | Authentication & Firestore |
| @react-native-async-storage/async-storage | 2.2.0 | Local data persistence |
| expo-location | ~19.0.7 | GPS location tracking |
| expo-local-authentication | ^17.0.7 | Biometric authentication |
| expo-notifications | ~0.32.13 | Push notifications |
| expo-file-system | ~19.0.19 | File operations |
| react-native-gesture-handler | ~2.28.0 | Gesture handling |
| react-native-reanimated | ~4.1.1 | Animations |

### Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Runtime |
| npm | Latest | Package manager |
| Expo CLI | Latest | Expo development tools |
| Babel | ^7.20.0 | JavaScript compiler |
| Metro Bundler | Built-in | React Native bundler |

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile Application                        │
│                  (React Native + Expo)                       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Features   │  │    Core      │  │   Shared     │     │
│  │   Modules    │  │ Infrastructure│  │   Code       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│                    (Port 3000)                               │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Request Routing & Load Balancing                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Auth Service │   │ Attendance   │   │ Leave Service │
│ (Port 3001)  │   │   Service    │   │  (Future)    │
└──────────────┘   └──────────────┘   └──────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Services                         │
│                                                               │
│  ┌──────────────┐              ┌──────────────┐            │
│  │ Firebase     │              │  Firestore   │            │
│  │ Authentication│              │   Database   │            │
│  └──────────────┘              └──────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Principles

1. **Separation of Concerns**: Clear boundaries between frontend, API Gateway, and services
2. **Service Independence**: Each microservice can be developed and deployed independently
3. **API Gateway Pattern**: Single entry point for all client requests
4. **Fail-Safe Design**: Fallback mechanisms for service failures
5. **Scalability**: Horizontal scaling capability for each service

---

## Microservices Architecture

### Service Overview

#### 1. API Gateway Service

**Location:** `services/api-gateway/`

**Purpose:** Single entry point for all client requests

**Technology:**
- Express.js 5.2.1
- http-proxy-middleware 3.0.5
- CORS 2.8.5

**Port:** 3000

**Responsibilities:**
- Route requests to appropriate microservices
- Handle CORS
- Request/response transformation
- Health checks
- Error handling

**Endpoints:**
```
GET  /health                    - Health check
POST /api/auth/login            - Forward to auth-service
GET  /api/auth/check-username/:username - Forward to auth-service
POST /api/auth/users            - Forward to auth-service
PATCH /api/auth/users/:username/role - Forward to auth-service
PATCH /api/auth/users/:username - Forward to auth-service
```

**Configuration:**
```javascript
// Environment variables
PORT=3000
AUTH_SERVICE_URL=http://localhost:3001
```

#### 2. Auth Service

**Location:** `services/auth-service/`

**Purpose:** Authentication and user management

**Technology:**
- Express.js 5.2.1
- Firebase Admin SDK 13.6.0
- Axios 1.13.2

**Port:** 3001

**Responsibilities:**
- User authentication
- Password verification
- User creation and management
- Role management
- Username validation

**Endpoints:**
```
GET  /health                    - Health check
POST /api/auth/login            - User authentication
GET  /api/auth/check-username/:username - Username availability
POST /api/auth/users            - Create user
PATCH /api/auth/users/:username/role - Update user role
PATCH /api/auth/users/:username - Update user info
```

**Authentication Flow:**
1. Receive username/email + password
2. If username: Query Firestore to get email
3. Verify password using Firebase Auth REST API
4. Retrieve user data from Firestore using Admin SDK
5. Return user object

**Configuration:**
```javascript
// Environment variables
PORT=3001
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
// OR
GOOGLE_CLIENT_EMAIL=...
GOOGLE_PRIVATE_KEY=...
GOOGLE_PROJECT_ID=...
FIREBASE_API_KEY=...
```

#### 3. Future Services

**Attendance Service** (`services/attendance-service/`)
- Handle attendance tracking
- Manage attendance records
- Calculate attendance statistics

**Leave Service** (`services/leave-service/`)
- Manage leave requests
- Track leave balances
- Process leave approvals

**Ticket Service** (`services/ticket-service/`)
- Handle support tickets
- Route tickets to departments
- Manage ticket lifecycle

---

## Frontend Architecture

### Directory Structure

```
apps/mobile/
├── App.js                      # Main entry point
├── app.json                    # Expo configuration
├── package.json                # Dependencies
├── babel.config.js             # Babel configuration
├── metro.config.js             # Metro bundler config
├── tailwind.config.js          # Tailwind configuration
│
├── core/                       # Core infrastructure
│   ├── config/                 # Configuration
│   │   ├── firebase.js        # Firebase config
│   │   └── api.js             # API Gateway config
│   ├── contexts/               # React Contexts
│   │   ├── AuthContext.js     # Authentication state
│   │   └── ThemeContext.js     # Theme state
│   ├── navigation/             # Navigation setup
│   │   ├── AppNavigator.js    # Main navigator
│   │   ├── AuthNavigator.js  # Auth flow
│   │   └── MainNavigator.js  # Main app flow
│   └── services/               # Core services
│       └── storage.js         # Storage abstraction
│
├── features/                    # Feature modules
│   ├── auth/                   # Authentication
│   │   ├── services/
│   │   ├── utils/
│   │   └── index.js
│   ├── calendar/               # Calendar
│   └── ...                     # Other features
│
├── shared/                     # Shared code
│   ├── components/             # Reusable components
│   ├── constants/              # Constants & enums
│   ├── utils/                 # Shared utilities
│   └── hooks/                  # Shared hooks
│
├── screens/                    # Screen components (legacy)
└── utils/                      # Utility functions (legacy)
```

### Core Components

#### 1. App.js
- Main application entry point
- Wraps app with Context providers
- Initializes navigation

#### 2. Context Providers

**AuthContext:**
- Manages user authentication state
- Provides login/logout functions
- Handles session persistence

**ThemeContext:**
- Manages theme state (light/dark)
- Provides theme toggle functions
- Persists theme preference

#### 3. Navigation Structure

```
AppNavigator
├── AuthNavigator (if not authenticated)
│   ├── LoginScreen
│   ├── SignUpScreen
│   └── AuthMethodSelection
│
└── MainNavigator (if authenticated)
    ├── EmployeeNavigator (for employees)
    │   └── EmployeeDashboard
    │
    └── AdminNavigator (for managers/admins)
        └── AdminDashboard
```

### State Management

- **Context API**: Global state (auth, theme)
- **Local State**: Component-level state (useState)
- **AsyncStorage**: Persistent local storage
- **Firebase**: Cloud state synchronization

---

## Backend Services

### Service Communication

```
Client → API Gateway → Microservice → Firebase
         (Port 3000)   (Port 3001+)
```

### Request Flow

1. **Client Request**: Mobile app sends HTTP request to API Gateway
2. **Routing**: API Gateway routes to appropriate service
3. **Processing**: Service processes request
4. **Database**: Service queries/updates Firebase
5. **Response**: Service returns response to API Gateway
6. **Client Response**: API Gateway returns response to client

### Error Handling

**API Gateway:**
- Service unavailable → 503
- Timeout → 504
- Invalid request → 400

**Auth Service:**
- Invalid credentials → 401
- User not found → 404
- Server error → 500

### Health Checks

All services implement health check endpoints:

```javascript
GET /health
Response: { status: "ok", service: "api-gateway", timestamp: "..." }
```

---

## Database & Storage

### Firebase Firestore

**Collection Structure:**
```
users/
  {uid}/
    - uid: string
    - username: string
    - email: string
    - name: string
    - role: "employee" | "manager" | "super_admin"
    - department: string
    - position: string
    - workMode: "in_office" | "semi_remote" | "fully_remote"
    - hireDate: string (YYYY-MM-DD)
    - isActive: boolean
    - createdAt: timestamp
    - updatedAt: timestamp
```

**Security Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && 
                     (request.auth.uid == userId || 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin');
      allow list: if true; // Required for username login
      allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin';
    }
  }
}
```

### AsyncStorage (Local)

**Storage Keys:**
- `@company_employees` - Employee list cache
- `@attendance_records` - Attendance data
- `@tickets` - Ticket data
- `@notifications` - Notification data
- `@leave_requests` - Leave request data
- `@signup_requests` - Signup request data
- `@auth_preferences` - Authentication preferences
- `@theme_preference` - Theme preference

**Data Format:**
- JSON strings stored as values
- Automatic serialization/deserialization

---

## Authentication & Security

### Authentication Methods

1. **Username/Email + Password**
   - Primary authentication method
   - Server-side password verification
   - Firebase Auth integration

2. **Biometric Authentication**
   - Face ID (iOS & Android)
   - Fingerprint (Android)
   - Device-native security

### Security Implementation

#### Password Security
- Passwords hashed by Firebase Authentication
- Never stored in plain text
- Server-side verification only
- No password retrieval possible

#### Session Management
- Firebase Auth session tokens
- AsyncStorage persistence
- Automatic session restoration
- Secure token storage

#### API Security
- CORS enabled for cross-origin requests
- Request timeout handling (10 seconds)
- Error message sanitization
- No sensitive data in logs

#### Role-Based Access Control
- Three roles: `employee`, `manager`, `super_admin`
- Permission checks at API level
- Department-based access for managers
- System-wide access for super admins

---

## API Documentation

### API Gateway Endpoints

#### Health Check
```
GET /health
Response: { status: "ok", service: "api-gateway" }
```

#### Authentication Endpoints (Proxied)

All auth endpoints are proxied to auth-service:

```
POST /api/auth/login
Body: { usernameOrEmail: string, password: string }
Response: { success: boolean, user: UserObject }

GET /api/auth/check-username/:username
Response: { available: boolean }

POST /api/auth/users
Body: UserObject
Response: { success: boolean, user: UserObject }

PATCH /api/auth/users/:username/role
Body: { role: string }
Response: { success: boolean }

PATCH /api/auth/users/:username
Body: Partial<UserObject>
Response: { success: boolean, user: UserObject }
```

### Auth Service Endpoints

#### Login
```
POST /api/auth/login
Content-Type: application/json

Request:
{
  "usernameOrEmail": "testuser",
  "password": "password123"
}

Response (Success):
{
  "success": true,
  "user": {
    "uid": "firebase_uid",
    "username": "testuser",
    "email": "testuser@company.com",
    "name": "Test User",
    "role": "employee",
    "department": "Engineering",
    ...
  }
}

Response (Error):
{
  "success": false,
  "error": "Invalid username or password"
}
```

#### Check Username
```
GET /api/auth/check-username/:username

Response:
{
  "available": true
}
```

#### Create User
```
POST /api/auth/users
Content-Type: application/json

Request:
{
  "username": "newuser",
  "email": "newuser@company.com",
  "password": "password123",
  "name": "New User",
  "role": "employee",
  "department": "Engineering",
  ...
}

Response:
{
  "success": true,
  "user": { ... }
}
```

---

## Development Setup

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for iOS) or Android Emulator (for Android)
- Firebase project with Authentication and Firestore enabled

### Installation Steps

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd AttendanceApp
   ```

2. **Install Mobile App Dependencies**
   ```bash
   cd apps/mobile
   npm install
   ```

3. **Install API Gateway Dependencies**
   ```bash
   cd services/api-gateway
   npm install
   ```

4. **Install Auth Service Dependencies**
   ```bash
   cd services/auth-service
   npm install
   ```

5. **Configure Firebase**
   - Create Firebase project
   - Enable Authentication (Email/Password)
   - Enable Firestore
   - Copy Firebase config to `apps/mobile/core/config/firebase.js`
   - Download service account key for auth-service

6. **Configure Environment Variables**

   **API Gateway** (`services/api-gateway/.env`):
   ```env
   PORT=3000
   AUTH_SERVICE_URL=http://localhost:3001
   ```

   **Auth Service** (`services/auth-service/.env`):
   ```env
   PORT=3001
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
   FIREBASE_API_KEY=your_api_key
   ```

7. **Start Services**

   **Option 1: Using Scripts**
   ```bash
   # Windows
   .\start-services.ps1
   
   # Linux/macOS
   ./start-services.sh
   ```

   **Option 2: Manual**
   ```bash
   # Terminal 1: API Gateway
   cd services/api-gateway
   npm start
   
   # Terminal 2: Auth Service
   cd services/auth-service
   npm start
   
   # Terminal 3: Mobile App
   cd apps/mobile
   npm start
   ```

### Development Workflow

1. Start backend services (API Gateway + Auth Service)
2. Start Expo development server
3. Open app in simulator/emulator or physical device
4. Make code changes (hot reload enabled)
5. Test features

---

## Build & Deployment

### Mobile App Build

#### Android Build
```bash
cd apps/mobile
npm run android:build
```

#### iOS Build
```bash
cd apps/mobile
npm run ios:build
```

### Backend Service Deployment

#### API Gateway
```bash
cd services/api-gateway
npm start
# Or use PM2 for production
pm2 start index.js --name api-gateway
```

#### Auth Service
```bash
cd services/auth-service
npm start
# Or use PM2 for production
pm2 start index.js --name auth-service
```

### Production Considerations

1. **Environment Variables**: Use secure environment variable management
2. **Service Account**: Secure Firebase service account credentials
3. **HTTPS**: Use HTTPS for all API endpoints
4. **Monitoring**: Set up logging and monitoring
5. **Scaling**: Use load balancers for multiple instances
6. **Database**: Configure Firestore indexes for production queries

---

## CI/CD Pipeline

### GitHub Actions Workflow

**File:** `.github/workflows/deploy.yml`

**Triggers:**
- Push to `master` or `main`
- Pull requests to `master` or `main`

**Workflow Steps:**

1. **Checkout Code**
   - Uses `actions/checkout@v3`

2. **Setup Node.js**
   - Uses `actions/setup-node@v4`
   - Node.js 18
   - npm caching enabled

3. **Verify npm Version**
   - Displays npm version for debugging

4. **Validate package-lock.json**
   - Validates JSON structure
   - Removes corrupted lockfile if invalid

5. **Install Dependencies**
   - Attempts `npm ci`
   - Falls back to `npm install` if needed
   - Auto-regenerates lockfile if corrupted

6. **Run Linter** (Optional)
   - `npm run lint`

7. **Check Formatting** (Optional)
   - `npm run format:check`

8. **Build Android**
   - `npm run android:build`
   - Environment: `EXPO_PUBLIC_ENV=production`

9. **Build iOS**
   - `npm run ios:build`
   - Environment: `EXPO_PUBLIC_ENV=production`

### Workflow Features

- ✅ Automatic dependency validation
- ✅ Package-lock.json corruption recovery
- ✅ Multi-platform builds
- ✅ Environment variable support
- ✅ Graceful error handling

---

## Testing

### Testing Strategy

#### Unit Tests
- Test individual functions and utilities
- Mock external dependencies
- Test edge cases

#### Integration Tests
- Test API endpoints
- Test service communication
- Test Firebase integration

#### E2E Tests
- Test complete user flows
- Test authentication flows
- Test role-based access

### Test Setup

```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react-native

# Run tests
npm test
```

---

## Performance Optimization

### Frontend Optimizations

1. **Code Splitting**: Lazy load screens and components
2. **Image Optimization**: Optimize images and use appropriate formats
3. **Memoization**: Use React.memo and useMemo for expensive operations
4. **List Optimization**: Use FlatList with proper keyExtractor
5. **AsyncStorage**: Batch operations and cache frequently accessed data

### Backend Optimizations

1. **Connection Pooling**: Reuse database connections
2. **Caching**: Cache frequently accessed data
3. **Request Batching**: Batch multiple operations
4. **Indexing**: Proper Firestore indexes for queries

### Network Optimizations

1. **Request Timeout**: 10-second timeout for API requests
2. **Retry Logic**: Automatic retry for failed requests
3. **Offline Support**: Local caching for offline access
4. **Compression**: Enable gzip compression

---

## Security Best Practices

### Code Security

1. **No Hardcoded Secrets**: Use environment variables
2. **Input Validation**: Validate all user inputs
3. **SQL Injection Prevention**: Use parameterized queries (Firestore handles this)
4. **XSS Prevention**: Sanitize user inputs
5. **CSRF Protection**: Use tokens for state-changing operations

### API Security

1. **Authentication**: All protected endpoints require authentication
2. **Authorization**: Role-based access control
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **HTTPS Only**: Use HTTPS in production
5. **CORS Configuration**: Proper CORS settings

### Data Security

1. **Password Hashing**: Firebase handles password hashing
2. **Encryption**: Encrypt sensitive data at rest
3. **Secure Storage**: Use secure storage for tokens
4. **Data Validation**: Validate data before storage

---

## Troubleshooting

### Common Issues

#### 1. npm ci "Invalid Version" Error

**Symptoms:** npm ci fails with "Invalid Version" error

**Solution:**
- Workflow automatically handles this
- Manually: Delete `package-lock.json` and run `npm install`

#### 2. Firebase Connection Issues

**Symptoms:** Cannot connect to Firebase

**Solution:**
- Check Firebase configuration
- Verify API keys
- Check network connectivity
- Verify Firestore security rules

#### 3. API Gateway Connection Failed

**Symptoms:** Frontend cannot connect to API Gateway

**Solution:**
- Verify API Gateway is running (port 3000)
- Check API Gateway URL in config
- Verify CORS settings
- Check network connectivity

#### 4. Authentication Failures

**Symptoms:** Login fails with various errors

**Solution:**
- Check Firebase Authentication is enabled
- Verify user exists in Firebase Auth
- Check Firestore document exists
- Verify password is correct
- Check service account credentials

#### 5. Metro Bundler Issues

**Symptoms:** App won't start or bundle errors

**Solution:**
- Clear Metro cache: `npx expo start -c`
- Delete node_modules and reinstall
- Check metro.config.js configuration

---

## Code Standards

### Naming Conventions

- **Files**: PascalCase for components, camelCase for utilities
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Components**: PascalCase
- **Functions**: camelCase

### Code Organization

- **Features**: Self-contained feature modules
- **Shared Code**: Reusable components and utilities
- **Core**: Infrastructure and configuration
- **Services**: Backend microservices

### Best Practices

1. **Modularity**: Keep features isolated
2. **Reusability**: Create reusable components
3. **Error Handling**: Comprehensive error handling
4. **Documentation**: Comment complex logic
5. **Type Safety**: Use consistent data structures

---

## Additional Resources

### Documentation
- [Modular Architecture Guide](MODULAR_ARCHITECTURE.md)
- [System Architecture](SYSTEM_ARCHITECTURE.md)
- [App Features](APP_FEATURES.md)
- [Structure Summary](STRUCTURE_SUMMARY.md)

### External Resources
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Express.js Documentation](https://expressjs.com/)

---

*Last Updated: 2025-12-16*

