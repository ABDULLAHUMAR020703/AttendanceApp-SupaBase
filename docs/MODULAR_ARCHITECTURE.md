# Modular Architecture Guide

## Overview

This document describes the modular architecture of the Attendance App, designed for maintainability, scalability, and deployment readiness.

## Directory Structure

```
AttendanceApp/
├── App.js                          # Main app entry point
├── app.json                        # Expo configuration
├── package.json                    # Dependencies
│
├── core/                           # Core application infrastructure
│   ├── config/                     # Configuration files
│   │   └── firebase.js            # Firebase configuration
│   ├── contexts/                   # React Context providers
│   │   ├── AuthContext.js         # Authentication context
│   │   └── ThemeContext.js        # Theme context
│   ├── navigation/                 # Navigation setup
│   │   ├── AppNavigator.js        # Main navigation logic
│   │   ├── AuthNavigator.js       # Auth flow navigation
│   │   └── MainNavigator.js       # Main app navigation
│   └── services/                   # External services
│       └── storage.js             # Storage abstraction layer
│
├── features/                       # Feature modules (self-contained)
│   ├── auth/                       # Authentication feature
│   │   ├── screens/               # Auth screens
│   │   │   ├── LoginScreen.js
│   │   │   ├── SignUpScreen.js
│   │   │   └── AuthenticationScreen.js
│   │   ├── components/            # Auth-specific components
│   │   ├── hooks/                 # Auth hooks
│   │   │   └── useAuth.js
│   │   ├── services/              # Auth services
│   │   │   ├── authService.js    # Auth business logic
│   │   │   └── signupService.js  # Signup logic
│   │   ├── utils/                 # Auth utilities
│   │   │   ├── biometricAuth.js
│   │   │   └── authPreferences.js
│   │   └── index.js               # Feature exports
│   │
│   ├── attendance/                 # Attendance feature
│   │   ├── screens/
│   │   │   ├── EmployeeDashboard.js
│   │   │   ├── AttendanceHistory.js
│   │   │   └── ManualAttendanceScreen.js
│   │   ├── components/
│   │   ├── hooks/
│   │   │   └── useAttendance.js
│   │   ├── services/
│   │   │   └── attendanceService.js
│   │   ├── utils/
│   │   │   ├── location.js
│   │   │   └── faceVerification.js
│   │   └── index.js
│   │
│   ├── tickets/                    # Ticket management feature
│   │   ├── screens/
│   │   │   ├── TicketScreen.js
│   │   │   └── TicketManagementScreen.js
│   │   ├── components/
│   │   ├── hooks/
│   │   │   └── useTickets.js
│   │   ├── services/
│   │   │   └── ticketService.js
│   │   ├── utils/
│   │   │   └── ticketRouting.js
│   │   └── index.js
│   │
│   ├── leave/                      # Leave management feature
│   │   ├── screens/
│   │   │   └── LeaveRequestScreen.js
│   │   ├── hooks/
│   │   │   └── useLeave.js
│   │   ├── services/
│   │   │   └── leaveService.js
│   │   └── index.js
│   │
│   ├── employees/                  # Employee management feature
│   │   ├── screens/
│   │   │   ├── EmployeeManagement.js
│   │   │   ├── CreateUserScreen.js
│   │   │   └── SignupApprovalScreen.js
│   │   ├── hooks/
│   │   │   └── useEmployees.js
│   │   ├── services/
│   │   │   └── employeeService.js
│   │   └── index.js
│   │
│   ├── notifications/              # Notifications feature
│   │   ├── screens/
│   │   │   └── NotificationsScreen.js
│   │   ├── hooks/
│   │   │   └── useNotifications.js
│   │   ├── services/
│   │   │   └── notificationService.js
│   │   └── index.js
│   │
│   ├── calendar/                   # Calendar feature
│   │   ├── screens/
│   │   │   └── CalendarScreen.js
│   │   ├── components/
│   │   │   └── DatePickerCalendar.js
│   │   ├── services/
│   │   │   └── calendarService.js
│   │   └── index.js
│   │
│   └── analytics/                  # Analytics feature
│       ├── screens/
│       │   ├── AdminDashboard.js
│       │   └── HRDashboard.js
│       ├── hooks/
│       │   └── useAnalytics.js
│       ├── services/
│       │   └── analyticsService.js
│       └── index.js
│
├── shared/                         # Shared code across features
│   ├── components/                 # Reusable UI components
│   │   ├── Logo.js
│   │   ├── Trademark.js
│   │   └── CustomDrawer.js
│   ├── hooks/                      # Shared hooks
│   │   └── useResponsive.js
│   ├── utils/                      # Shared utilities
│   │   ├── responsive.js
│   │   ├── export.js
│   │   └── storage.js
│   ├── constants/                  # Constants and enums
│   │   ├── roles.js
│   │   ├── workModes.js
│   │   └── routes.js
│   └── types/                      # Type definitions (JSDoc)
│
├── screens/                        # Legacy screens (to be migrated)
│
├── utils/                          # Legacy utils (to be migrated)
│
├── components/                     # Legacy components (to be migrated)
│
├── scripts/                        # Build and deployment scripts
│   ├── migrate-users-to-firebase.mjs
│   └── sync-users.js
│
├── docs/                           # Documentation
│   ├── MODULAR_ARCHITECTURE.md
│   ├── SYSTEM_ARCHITECTURE.md
│   └── FIREBASE_SETUP.md
│
└── .github/                        # GitHub workflows (CI/CD)
    └── workflows/
        └── deploy.yml
```

## Principles

### 1. Feature-Based Modules
Each feature is self-contained with:
- **Screens**: UI components for the feature
- **Components**: Feature-specific reusable components
- **Hooks**: Custom React hooks for feature logic
- **Services**: Business logic and API calls
- **Utils**: Feature-specific utilities
- **index.js**: Public API for the feature

### 2. Dependency Rules
- ✅ Features can import from `shared/` and `core/`
- ✅ Features can import from other features via their `index.js`
- ❌ Features should NOT directly import from other features' internals
- ❌ Shared code should NOT import from features

### 3. Separation of Concerns
- **Screens**: Presentation logic only
- **Services**: Business logic, data operations
- **Hooks**: State management, side effects
- **Utils**: Pure functions, helpers
- **Components**: Reusable UI elements

### 4. Deployment Structure
- Configuration files at root level
- Build scripts in `scripts/`
- CI/CD workflows in `.github/workflows/`
- Documentation in `docs/`

## Migration Strategy

1. **Phase 1**: Create new structure alongside existing code
2. **Phase 2**: Migrate features one by one
3. **Phase 3**: Update imports gradually
4. **Phase 4**: Remove legacy code

## Benefits

1. **Maintainability**: Clear feature boundaries
2. **Scalability**: Easy to add new features
3. **Testability**: Isolated modules are easier to test
4. **Team Collaboration**: Multiple developers can work on different features
5. **Deployment**: Clear structure for CI/CD pipelines
6. **Code Reuse**: Shared code in one place

