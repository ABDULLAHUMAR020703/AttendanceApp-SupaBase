# Present - Complete Application Features Documentation

## 📱 Application Overview

**Present** is a comprehensive employee management and attendance tracking system built with React Native and Expo. The app provides a complete solution for organizations to manage employee attendance, leaves, support tickets, analytics, and workforce administration.

### Key Highlights
- **Multi-Platform**: iOS and Android support via React Native
- **Role-Based Access**: Three distinct user roles with tailored permissions
- **Modern UI**: Dark mode support, responsive design, intuitive navigation
- **Secure Authentication**: Multiple authentication methods including biometric
- **Real-Time Tracking**: GPS-based attendance with location verification
- **Comprehensive Analytics**: Detailed reports and insights for management

---

## 🔐 Authentication & Security Features

### Authentication Methods

#### 1. **Username/Email Login**
- Login using either username or email address
- Secure password authentication via Firebase
- Automatic session persistence
- Remember me functionality

#### 2. **Biometric Authentication**
- **Face ID** (iOS & Android)
  - Native device face recognition
  - Secure check-in/check-out verification
  - Quick and convenient access
  
- **Fingerprint Authentication**
  - Touch ID support
  - Alternative biometric method
  - Device-native security

#### 3. **Authentication Preferences**
- Users can set preferred authentication method
- Toggle between biometric and password
- Per-user authentication settings
- Automatic fallback to password if biometric fails

### Security Features
- Supabase Authentication integration
- Secure session management
- AsyncStorage for local session persistence via custom adapter
- Role-based access control
- Protected routes based on user roles

---

## 👥 User Roles & Permissions

### 1. **Employee Role** (`employee`)

**Access Level**: Personal dashboard and self-service features

**Can Do:**
- ✅ Check in/Check out with authentication
- ✅ View personal attendance history
- ✅ Submit leave requests
- ✅ View leave balance and remaining leaves
- ✅ Create and track support tickets
- ✅ View personal notifications
- ✅ Request work mode changes
- ✅ View calendar and events
- ✅ Change theme preferences (Light/Dark mode)
- ✅ View personal analytics (attendance rate, hours worked)

**Cannot Do:**
- ❌ View other employees' data
- ❌ Approve leave requests
- ❌ Manage tickets (except own)
- ❌ Create users
- ❌ Access admin dashboards
- ❌ Export data
- ❌ Manual attendance entry

---

### 2. **Manager Role** (`manager`)

**Access Level**: Department-level management and oversight

**Can Do:**
- ✅ All Employee features, plus:
- ✅ View department attendance records
- ✅ Manage tickets assigned to their department
- ✅ Approve/reject leave requests for department members
- ✅ View department analytics
- ✅ Manual attendance entry for department members
- ✅ View HR Dashboard
- ✅ Approve signup requests
- ✅ Filter and search attendance records
- ✅ Export attendance data

**Department-Specific Access:**
- Managers only see data for their assigned department
- Automatic ticket routing to department managers
- Department-based leave approval workflow

**Cannot Do:**
- ❌ Create new users (Super Admin only)
- ❌ Access all departments (only their own)
- ❌ System-wide settings
- ❌ Delete users

---

### 3. **Super Admin Role** (`super_admin`)

**Access Level**: Full system access across all departments

**Can Do:**
- ✅ All Manager features, plus:
- ✅ Create new users manually
- ✅ View all employees across all departments
- ✅ Access all attendance records (system-wide)
- ✅ Manage all tickets (all departments)
- ✅ Approve/reject all leave requests
- ✅ Approve signup requests
- ✅ View comprehensive analytics (all departments)
- ✅ Export system-wide reports
- ✅ Manual attendance entry for any employee
- ✅ Employee management (edit, update roles)
- ✅ System configuration access

**Exclusive Features:**
- User creation and management
- System-wide data access
- Complete administrative control

---

## 📊 Core Features

### 1. **Attendance Management**

#### Check-In/Check-Out System
- **Multiple Authentication Methods**
  - Password authentication
  - Face ID verification
  - Fingerprint authentication
  - User-preferred method selection

- **Location Tracking**
  - GPS coordinates captured automatically
  - Address resolution via OpenStreetMap
  - Location verification for attendance
  - Coordinates stored with each record

- **Attendance Records**
  - Timestamp for each check-in/check-out
  - Location data (coordinates + address)
  - Authentication method used
  - Record type (check-in or check-out)
  - User identification

#### Attendance History
- **Personal View (Employees)**
  - View all personal attendance records
  - Filter by check-in, check-out, or all
  - Sort by date (newest/oldest)
  - Search functionality
  - Date range filtering

- **Admin View (Managers/Super Admins)**
  - View all employees' attendance
  - Filter by employee name
  - Filter by type (check-in/check-out)
  - Search across all records
  - Export to CSV functionality

#### Manual Attendance Entry
- **For Managers & Super Admins**
  - Create attendance records manually
  - Select employee
  - Set date and time
  - Add location information
  - Mark as manual entry
  - Useful for corrections or missed check-ins

#### Attendance Analytics
- **Personal Analytics (Employees)**
  - Attendance rate (weekly, monthly, yearly)
  - Average hours worked per day
  - Total hours worked
  - Days worked count
  - Visual charts and statistics

- **Department Analytics (Managers)**
  - Department attendance overview
  - Employee attendance rates
  - Department statistics

- **System Analytics (Super Admins)**
  - Company-wide attendance statistics
  - Department comparisons
  - Attendance trends
  - Exportable reports

---

### 2. **Leave Management**

#### Leave Types
- **Annual Leave**
  - Default: 20 days per year
  - Configurable per employee
  - Full day or half day options

- **Sick Leave**
  - Default: 10 days per year
  - Configurable per employee
  - Full day or half day options

- **Casual Leave**
  - Default: 5 days per year
  - Configurable per employee
  - Full day or half day options

#### Leave Request Features
- **Submit Leave Requests**
  - Select leave type (Annual/Sick/Casual)
  - Choose start and end dates
  - Full day or half day selection
  - Half day options: Morning or Afternoon
  - Add reason/description
  - View leave balance before submitting

- **Leave Request Status**
  - **Pending**: Awaiting approval
  - **Approved**: Request approved by manager/admin
  - **Rejected**: Request denied
  - **Cancelled**: Employee cancelled request

- **Leave Balance Tracking**
  - View available leaves for each type
  - Track used leaves
  - Calculate remaining leaves
  - Automatic deduction on approval

#### Leave Approval Workflow
- **For Managers:**
  - View pending leave requests for department
  - Approve or reject requests
  - Add comments/notes
  - Automatic notification to employee

- **For Super Admins:**
  - View all pending leave requests
  - Approve or reject any request
  - Override manager decisions
  - System-wide leave management

#### Leave Settings
- **Default Leave Settings**
  - Configure default annual leaves
  - Configure default sick leaves
  - Configure default casual leaves
  - Set leave year start/end dates

- **Custom Leave Balance**
  - Set custom leave balance per employee
  - Override default settings
  - Track custom allocations

---

### 3. **Ticket Management System**

#### Ticket Categories
- **Technical**: IT/Engineering issues
- **HR**: Human resources inquiries
- **Finance**: Financial matters
- **Facilities**: Office/facility requests
- **Other**: General inquiries

#### Ticket Priorities
- **Low**: Non-urgent issues
- **Medium**: Standard priority
- **High**: Important issues
- **Urgent**: Critical issues requiring immediate attention

#### Ticket Status
- **Open**: Newly created ticket
- **In Progress**: Being worked on
- **Resolved**: Issue fixed, awaiting confirmation
- **Closed**: Ticket completed and closed

#### Automatic Ticket Routing
- **Smart Department Assignment**
  - Technical tickets → Engineering department manager
  - HR tickets → HR department manager
  - Finance tickets → Finance department manager
  - Facilities tickets → Facilities department manager
  - Other tickets → Super Admin only

- **Notification System**
  - Super Admin notified of all tickets
  - Department manager auto-assigned and notified
  - Employee notified of status changes

#### Ticket Features
- **Create Tickets (Employees)**
  - Select category
  - Set priority level
  - Enter subject and description
  - Automatic assignment to appropriate manager
  - Track ticket status

- **Manage Tickets (Managers/Admins)**
  - View all assigned tickets
  - Filter by status, priority, category
  - Update ticket status
  - Add responses/comments
  - Reassign tickets
  - Close tickets

- **Ticket Responses**
  - Add comments/responses
  - Communication thread
  - Status updates
  - Resolution notes

---

### 4. **Employee Management**

#### Employee Profiles
- **Employee Information**
  - Username (unique identifier)
  - Email address
  - Full name
  - Role (Employee/Manager/Super Admin)
  - Department
  - Position/Job title
  - Work mode (In Office/Semi Remote/Fully Remote)
  - Hire date
  - Active status

#### Work Modes
- **In Office**
  - Employee must work from office location
  - Location tracking required

- **Semi Remote**
  - Employee can work from home or office
  - Flexible location

- **Fully Remote**
  - Employee works remotely from any location
  - No office requirement

#### Work Mode Requests
- **Request Work Mode Change**
  - Employees can request work mode changes
  - Add reason for request
  - Status tracking (Pending/Approved/Rejected)
  - Manager/Admin approval required

#### Employee Management Features
- **Create Users (Super Admin)**
  - Manual user creation
  - Set all employee details
  - Assign role and department
  - Set work mode
  - Configure leave balance

- **Edit Employee Information**
  - Update employee details
  - Change role (promote/demote)
  - Update department
  - Modify work mode
  - Update leave balance

- **Signup Approval**
  - Review pending signup requests
  - Approve or reject new user registrations
  - Set role and department during approval

---

### 5. **Notifications System**

#### Notification Types
- **Attendance Notifications**
  - Check-in confirmation
  - Check-out confirmation
  - Attendance reminders

- **Leave Notifications**
  - Leave request submitted
  - Leave request approved
  - Leave request rejected
  - Leave balance updates

- **Ticket Notifications**
  - Ticket created
  - Ticket assigned
  - Ticket status updated
  - Ticket response added

- **Work Mode Notifications**
  - Work mode request submitted
  - Work mode request approved/rejected

- **System Notifications**
  - Signup request notifications (for admins)
  - General announcements

#### Notification Features
- **Unread Count Badge**
  - Display unread notification count
  - Real-time updates
  - Badge on dashboard

- **Notification Center**
  - View all notifications
  - Mark as read/unread
  - Filter notifications
  - Delete notifications
  - Notification history

---

### 6. **Analytics & Reporting**

#### HR Dashboard
- **Overview Statistics**
  - Total employees count
  - Total attendance records
  - Pending leave requests
  - Open tickets count

- **Attendance Analytics**
  - Attendance trends
  - Department-wise statistics
  - Employee attendance rates
  - Time-based analysis

- **Leave Analytics**
  - Leave request statistics
  - Leave balance overview
  - Leave usage trends
  - Department leave analysis

- **Ticket Analytics**
  - Ticket status distribution
  - Category-wise tickets
  - Priority analysis
  - Resolution time tracking

#### Report Generation
- **Attendance Reports**
  - Export attendance data to CSV
  - Date range selection
  - Employee filtering
  - Department filtering

- **Leave Reports**
  - Leave request reports
  - Leave balance reports
  - Usage statistics

#### Personal Analytics (Employees)
- **Attendance Rate**
  - Weekly attendance percentage
  - Monthly attendance percentage
  - Yearly attendance percentage

- **Work Statistics**
  - Average hours per day
  - Total hours worked
  - Days worked count
  - Attendance streak

---

### 7. **Calendar & Events**

#### Calendar Features
- **View Calendar**
  - Monthly calendar view
  - Date selection
  - Event highlighting

- **Attendance Events**
  - Mark check-in dates
  - Mark check-out dates
  - View attendance history on calendar

- **Leave Events**
  - Mark approved leave dates
  - Mark pending leave requests
  - Visual leave calendar

- **Event Details**
  - Click date to view events
  - Event type indicators
  - Event descriptions

---

### 8. **Theme & Customization**

#### Theme Options
- **Light Mode**
  - Default light theme
  - Bright interface
  - Standard colors

- **Dark Mode**
  - Dark theme support
  - Reduced eye strain
  - Modern appearance
  - System preference detection

#### Theme Features
- **Theme Settings**
  - Toggle between light/dark mode
  - Persistent theme selection
  - App-wide theme application
  - Smooth theme transitions

---

### 9. **Data Export & Import**

#### Export Features
- **Attendance Export**
  - Export to CSV format
  - Include all attendance records
  - Filtered export options
  - Date range selection

- **Report Export**
  - Generate attendance reports
  - Generate leave reports
  - CSV file format
  - Save to device

---

## 📱 User Interface Features

### Navigation
- **Drawer Navigation**
  - Slide-out menu
  - Quick access to features
  - Role-based menu items
  - User profile display

- **Stack Navigation**
  - Screen transitions
  - Back navigation
  - Header customization
  - Role-based routes

### Responsive Design
- **Screen Size Adaptation**
  - Responsive layouts
  - Adaptive components
  - Mobile-optimized UI
  - Tablet support

### UI Components
- **Modern Design**
  - Clean interface
  - Intuitive icons
  - Color-coded status indicators
  - Loading states
  - Error handling
  - Empty states

---

## 🔧 Technical Features

### Data Storage
- **Supabase Integration**
  - User authentication
  - User profiles (PostgreSQL)
  - Real-time sync
  - Cloud storage

- **Local Storage (AsyncStorage)**
  - Attendance records
  - Tickets
  - Notifications
  - Leave requests
  - Signup requests
  - Employee cache

### Offline Support
- **Local Data Persistence**
  - Works offline
  - Sync when online
  - Local cache
  - Offline-first approach

### Location Services
- **GPS Integration**
  - Location tracking
  - Address resolution
  - Coordinate storage
  - Location verification

### Push Notifications
- **Expo Notifications**
  - Push notification support
  - Local notifications
  - Notification scheduling
  - Badge management

---

## 📋 Feature Matrix by Role

| Feature | Employee | Manager | Super Admin |
|---------|----------|----------|-------------|
| Check In/Out | ✅ | ✅ | ✅ |
| View Own Attendance | ✅ | ✅ | ✅ |
| View All Attendance | ❌ | ✅ (Dept) | ✅ (All) |
| Submit Leave Request | ✅ | ✅ | ✅ |
| Approve Leave | ❌ | ✅ (Dept) | ✅ (All) |
| Create Ticket | ✅ | ✅ | ✅ |
| Manage Tickets | ❌ | ✅ (Dept) | ✅ (All) |
| View Analytics | ✅ (Own) | ✅ (Dept) | ✅ (All) |
| Create Users | ❌ | ❌ | ✅ |
| Manual Attendance | ❌ | ✅ (Dept) | ✅ (All) |
| Export Data | ❌ | ✅ | ✅ |
| Approve Signups | ❌ | ✅ | ✅ |
| HR Dashboard | ❌ | ✅ | ✅ |
| Employee Management | ❌ | ❌ | ✅ |

---

## 🎯 Use Cases

### For Employees
1. **Daily Check-In/Out**
   - Quick biometric authentication
   - Automatic location capture
   - View attendance history

2. **Leave Management**
   - Request time off
   - Track leave balance
   - View leave history

3. **Support Tickets**
   - Report issues
   - Track ticket status
   - Communicate with managers

4. **Personal Analytics**
   - Monitor attendance rate
   - Track hours worked
   - View statistics

### For Managers
1. **Department Oversight**
   - Monitor team attendance
   - Approve leave requests
   - Manage department tickets

2. **Analytics & Reports**
   - View department statistics
   - Generate reports
   - Export data

3. **Team Management**
   - Manual attendance entry
   - Approve work mode changes
   - Review signup requests

### For Super Admins
1. **System Administration**
   - Create and manage users
   - System-wide oversight
   - Complete analytics

2. **Data Management**
   - Export all data
   - Generate comprehensive reports
   - System configuration

3. **Full Control**
   - Override manager decisions
   - Access all departments
   - Complete administrative control

---

## 🚀 Getting Started

### For New Users
1. **Sign Up**
   - Submit signup request
   - Wait for admin approval
   - Receive credentials

2. **First Login**
   - Login with username/email
   - Set authentication preferences
   - Explore dashboard

3. **Initial Setup**
   - Configure theme
   - Set authentication method
   - Review features

### For Administrators
1. **User Management**
   - Approve signup requests
   - Create users manually
   - Assign roles and departments

2. **System Configuration**
   - Set default leave settings
   - Configure departments
   - Set up managers

---

## 📝 Summary

**Present** is a comprehensive employee management solution offering:

✅ **Complete Attendance Tracking** with biometric authentication  
✅ **Flexible Leave Management** with approval workflows  
✅ **Smart Ticket System** with automatic routing  
✅ **Detailed Analytics** for data-driven decisions  
✅ **Role-Based Access** for secure operations  
✅ **Modern UI/UX** with dark mode support  
✅ **Offline Capability** for reliable access  
✅ **Export Functionality** for reporting needs  

The app provides everything needed for modern workforce management in a single, user-friendly mobile application.

---

**Note**: For technical implementation details, architecture, and code structure, see:
- `docs/SYSTEM_ARCHITECTURE.md` - System architecture and user management
- `docs/MODULAR_ARCHITECTURE.md` - Code structure and migration status
- `docs/STRUCTURE_SUMMARY.md` - Quick reference for code organization

