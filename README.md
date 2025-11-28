# Attendance App - Complete Employee Management System

A comprehensive attendance tracking and employee management application built with React Native and Expo SDK 54. Features role-based authentication, biometric authentication, advanced analytics, leave management, ticket system, and more.

## 📱 Overview

The Attendance App is a full-featured employee management system designed for organizations to track employee attendance, manage leaves, handle support tickets, and analyze workforce data. The app supports multiple authentication methods, provides detailed analytics, and offers a modern, responsive UI with dark mode support.

## ✨ Key Features

### 🔐 Authentication & Security
- **Multiple Authentication Methods**:
  - Face ID (iOS & Android) - Device native face recognition
  - Biometric Authentication - Fingerprint/Face unlock
  - Photo Verification - Camera-based face verification
- **Role-Based Access Control**:
  - Employee role with personal dashboard
  - Admin role with full system access
  - HR role with analytics and management tools
- **Session Management** - Secure session handling with AsyncStorage

### 👤 Employee Features

#### Attendance Management
- **Check In/Check Out** with multiple authentication options
- **Attendance History** - View all personal attendance records
- **Filter Records** - Filter by check-in, check-out, or view all
- **Location Tracking** - GPS coordinates captured with each attendance
- **Photo Capture** - Selfie verification for attendance

#### Personal Dashboard
- **Current Status** - See last check-in/check-out status
- **Personal Analytics**:
  - Attendance rate (weekly, monthly, yearly)
  - Average hours worked per day
  - Total hours worked
  - Days worked count
- **Leave Management**:
  - View leave balance (Annual, Sick, Casual)
  - Submit leave requests (Full day or Half day)
  - Half-day leave support (Morning/Afternoon)
  - Track leave request status
- **Work Mode Requests** - Request work mode changes (In Office, Semi Remote, Fully Remote)
- **Notifications** - Real-time notifications for approvals, rejections, and updates
- **Tickets** - Create and track support tickets

#### Additional Features
- **Calendar View** - View events and leave dates
- **Theme Settings** - Light/Dark mode with system preference support
- **Authentication Settings** - Choose preferred authentication method

### 👨‍💼 Admin Features

#### Dashboard
- **Multi-Tab Interface** (horizontally scrollable):
  - Attendance - View all employee attendance records
  - Employees - Manage employee profiles and work modes
  - Calendar - View company-wide calendar and events
  - HR - Access HR dashboard with analytics

#### Attendance Management
- **View All Records** - See attendance from all employees
- **Search & Filter** - Search by username, filter by type (check-in/check-out)
- **Statistics** - Total records, check-ins, check-outs
- **CSV Export** - Export all attendance data to CSV format
- **Data Management** - Clear all records functionality

#### Employee Management
- **Employee Profiles** - View and manage employee information
- **Work Mode Management** - Update employee work modes
- **Leave Management**:
  - Set default leave balances
  - Manage individual employee leave balances
  - View and process leave requests
- **Work Mode Requests** - Approve/reject work mode change requests
- **Leave Requests** - Process employee leave requests

### 📊 HR Dashboard Features

#### Analytics Tab
- **Employee Analytics** - View analytics for all employees:
  - Attendance rate percentage
  - Average hours per day
  - Total hours worked
  - Days worked count
- **Period Filters** - Daily, Weekly, Monthly, Yearly, All-time
- **Employee Comparison** - Sort by attendance rate

#### Overview Tab
- **Quick Stats**:
  - Total employees count
  - Total attendance records
  - Pending leave requests
  - Open tickets
- **Quick Actions**:
  - Manage employees
  - Generate attendance reports
  - Generate leave reports

#### Additional Tabs
- **Attendance** - Recent attendance records
- **Leaves** - All leave requests with status
- **Tickets** - Support ticket management
- **Analytics** - Advanced analytics dashboard

### 🎫 Ticket System
- **Create Tickets** - Employees can create support tickets
- **Ticket Categories** - Technical, HR, Finance, General
- **Priority Levels** - Low, Medium, High, Urgent
- **Status Tracking** - Open, In Progress, Resolved, Closed
- **Ticket Management** - Admins can assign, respond, and update tickets
- **Notifications** - Real-time updates on ticket status

### 📅 Calendar & Events
- **Calendar View** - Monthly calendar with event indicators
- **Event Management** - Create, view, edit, and delete events
- **Event Types** - Meeting, Holiday, Training, Other
- **Leave Dates** - Visual indicators for employee leave dates
- **Date Selection** - View events and leaves for specific dates

### 📈 Advanced Analytics
- **Attendance Rate Calculation**:
  - Percentage of days with attendance
  - Present days vs total working days
  - Supports multiple time periods
- **Average Hours Calculation**:
  - Average hours worked per day
  - Total hours worked in period
  - Days worked count
  - Daily breakdown available
- **Period Support**:
  - Daily
  - Weekly
  - Monthly
  - Yearly
  - All-time

### 🎨 UI/UX Features
- **Dark Mode Support** - Full dark mode with consistent theming
- **Theme Settings** - Light, Dark, or System preference
- **Responsive Design** - Works on all screen sizes
- **Smooth Animations** - Modern UI with smooth transitions
- **Back Navigation** - Consistent back buttons on all screens
- **Horizontal Scrolling** - Scrollable tabs for better mobile experience

### 🔔 Notifications
- **Real-time Notifications** - Push notifications for:
  - Leave request approvals/rejections
  - Work mode request updates
  - Ticket status changes
  - Admin responses
- **Notification Center** - View all notifications
- **Unread Count** - Badge showing unread notifications

### 📤 Data Export
- **CSV Export** - Export attendance data to CSV
- **Report Generation** - Generate attendance and leave reports
- **Data Formatting** - Well-formatted export files

## 🛠️ Tech Stack

### Core Technologies
- **React Native** 0.81.5
- **Expo SDK** 54.0.22
- **React** 19.1.0
- **React Navigation** 6.x - Stack navigation

### Key Libraries
- **@react-native-async-storage/async-storage** - Local data persistence
- **expo-camera** - Camera integration for photo capture
- **expo-location** - GPS location tracking
- **expo-local-authentication** - Biometric and Face ID authentication
- **expo-notifications** - Push notifications
- **expo-file-system** - File operations and CSV export
- **@expo/vector-icons** - Icon library
- **nativewind** - Tailwind CSS for React Native
- **tailwindcss** - Utility-first CSS framework

### Architecture
- **Context API** - AuthContext and ThemeContext for state management
- **AsyncStorage** - Local data storage (Firebase disabled, using local storage)
- **Modular Utilities** - Organized utility functions for different features

## 📦 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device (for testing)
- iOS Simulator (for iOS development) or Android Emulator (for Android development)

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd AttendanceApp
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start the Development Server**
   ```bash
   npm start
   # or
   expo start
   ```

4. **Run on Device/Simulator**
   - **iOS**: Press `i` in the terminal or scan QR code with Expo Go
   - **Android**: Press `a` in the terminal or scan QR code with Expo Go
   - **Web**: Press `w` in the terminal

### Configuration

#### User Authentication
Users are stored in `users.txt` file. Format:
```
username,password:password123,role:employee
username2,password:password456,role:admin
```

#### Firebase (Optional)
Firebase is currently disabled. To enable:
1. Uncomment code in `config/firebase.js`
2. Add your Firebase configuration
3. Update imports in relevant files

#### Permissions
The app requires the following permissions:
- **Camera** - For attendance photo capture
- **Location** - For GPS tracking (optional)
- **Biometric/Face ID** - For authentication (if enabled)
- **Notifications** - For push notifications

## 📁 Project Structure

```
AttendanceApp/
├── App.js                      # Main app component with navigation
├── app.json                    # Expo configuration
├── package.json                # Dependencies and scripts
├── babel.config.js             # Babel configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── metro.config.js             # Metro bundler configuration
├── users.txt                   # User credentials file
│
├── assets/                     # App assets
│   ├── icon.png               # App icon
│   ├── splash.png             # Splash screen
│   └── faces/                 # Face verification images
│
├── config/                     # Configuration files
│   └── firebase.js            # Firebase config (disabled)
│
├── contexts/                   # React Context providers
│   ├── AuthContext.js         # Authentication context
│   └── ThemeContext.js        # Theme management context
│
├── screens/                    # Screen components
│   ├── LoginScreen.js         # Login/authentication screen
│   ├── EmployeeDashboard.js   # Employee main dashboard
│   ├── AdminDashboard.js      # Admin main dashboard
│   ├── HRDashboard.js         # HR analytics dashboard
│   ├── AttendanceHistory.js   # Attendance records list
│   ├── CameraScreen.js        # Camera for photo capture
│   ├── AuthMethodSelection.js # Authentication method selection
│   ├── LeaveRequestScreen.js  # Leave request management
│   ├── CalendarScreen.js      # Calendar and events
│   ├── ThemeSettingsScreen.js # Theme settings
│   ├── NotificationsScreen.js  # Notifications center
│   ├── TicketScreen.js        # Employee ticket management
│   ├── TicketManagementScreen.js # Admin ticket management
│   └── EmployeeManagement.js  # Employee profile management
│
└── utils/                      # Utility functions
    ├── analytics.js           # Analytics calculations
    ├── auth.js                # Authentication logic
    ├── authPreferences.js     # Auth method preferences
    ├── biometricAuth.js       # Biometric authentication
    ├── faceVerification.js    # Face ID verification
    ├── storage.js             # AsyncStorage operations
    ├── export.js              # CSV export functionality
    ├── employees.js           # Employee management
    ├── leaveManagement.js     # Leave request system
    ├── ticketManagement.js    # Ticket system
    ├── calendar.js            # Calendar and events
    ├── notifications.js       # Notification system
    ├── location.js            # Location services
    ├── workModes.js           # Work mode management
    ├── hrRoles.js             # HR role utilities
    └── firestore.js           # Firestore utilities (disabled)
```

## 🚀 Usage Guide

### For Employees

1. **Login**
   - Enter username and password
   - Select your role (employee)

2. **Check In/Out**
   - Tap "Check In" or "Check Out" button
   - Choose authentication method (Face ID, Biometric, or Photo)
   - Complete authentication
   - Location and photo are captured automatically

3. **View Analytics**
   - Navigate to Employee Dashboard
   - View your attendance rate and average hours
   - Filter by period (weekly, monthly, yearly)

4. **Request Leave**
   - Go to Leave Requests
   - Tap "New Request"
   - Select leave type (Annual/Sick/Casual)
   - Choose duration (Full Day or Half Day)
   - For half-day: Select Morning or Afternoon period
   - Select date(s) and reason
   - Submit request

5. **Create Tickets**
   - Go to My Tickets
   - Tap "New Ticket"
   - Fill in category, priority, subject, and description
   - Submit ticket

### For Admins

1. **View Attendance**
   - Navigate to Admin Dashboard
   - Select "Attendance" tab
   - View all employee records
   - Use search and filters
   - Export to CSV

2. **Manage Employees**
   - Select "Employees" tab
   - View employee list
   - Update work modes
   - Manage leave balances
   - Process requests

3. **HR Analytics**
   - Navigate to HR Dashboard
   - View analytics for all employees
   - Filter by time period
   - Generate reports

4. **Manage Tickets**
   - View all tickets
   - Assign to employees
   - Update status
   - Respond to tickets

## 🔑 Demo Credentials

```
Employee:
Username: testuser
Password: testuser123

Admin:
Username: testadmin
Password: testadmin123
```

## 📊 Features Breakdown

### Authentication Methods

1. **Face ID (Device Native)**
   - iOS: Uses Face ID
   - Android: Uses Face Unlock
   - Requires device setup in settings
   - Most secure method

2. **Biometric Authentication**
   - Fingerprint (Android)
   - Face ID (iOS)
   - Fallback to Face Verification if unavailable

3. **Photo Verification**
   - Camera-based face verification
   - Works in Expo Go
   - Fallback option

### Work Modes

- **In Office** - Employee works from office
- **Semi Remote** - Hybrid work arrangement
- **Fully Remote** - Complete remote work

### Leave Types

- **Annual Leave** - Standard vacation days
- **Sick Leave** - Medical leave
- **Casual Leave** - Personal leave

### Leave Duration Options

- **Full Day** - Complete day leave (counts as 1 day)
- **Half Day** - Partial day leave (counts as 0.5 days)
  - **Morning** - First half of the day
  - **Afternoon** - Second half of the day

### Ticket Categories

- **Technical** - IT and technical issues
- **HR** - Human resources related
- **Finance** - Financial matters
- **General** - General inquiries

### Ticket Priorities

- **Low** - Non-urgent issues
- **Medium** - Normal priority
- **High** - Important issues
- **Urgent** - Critical issues

## 🎨 Theme System

The app supports comprehensive theming:

- **Light Mode** - Default light theme
- **Dark Mode** - Dark theme with proper contrast
- **System Preference** - Follows device theme
- **Consistent Colors** - All UI elements adapt to theme
- **Theme Context** - Centralized theme management

## 📱 Platform Support

- **iOS** - Full support with Face ID
- **Android** - Full support with Face Unlock and Fingerprint
- **Web** - Limited support (some features may not work)

## 🔒 Security Features

- **Secure Authentication** - Multiple authentication layers
- **Biometric Security** - Device-native biometric authentication
- **Location Verification** - GPS tracking for attendance
- **Photo Verification** - Visual confirmation of attendance
- **Session Management** - Secure session handling

## 📈 Analytics Features

### Attendance Rate
- Calculates percentage of days with attendance
- Excludes weekends from working days
- Supports multiple time periods
- Shows present days vs total days

### Average Hours
- Calculates average hours worked per day
- Only counts days with complete check-in/check-out pairs
- Provides total hours worked
- Shows daily breakdown

## 🐛 Known Limitations

- Firebase is currently disabled (using AsyncStorage)
- Some features may not work in Expo Go (biometric auth on Android)
- Web platform has limited functionality
- Data is stored locally (no cloud sync)

## 🔮 Future Enhancements

- Cloud sync with Firebase/backend
- Push notifications for attendance reminders
- Advanced reporting with charts and graphs
- Multi-language support
- Offline mode with sync
- Export to PDF format
- Email notifications
- Integration with payroll systems
- Shift management
- Overtime tracking
- Break time tracking

## 📝 Development Notes

### Code Structure
- **Modular Design** - Separated concerns with utility functions
- **Context API** - Global state management
- **React Hooks** - Modern React patterns
- **Error Handling** - Comprehensive error handling throughout
- **Type Safety** - Consistent data structures

### Best Practices
- Clean code with comments
- Consistent naming conventions
- Reusable components
- Proper error handling
- User feedback for all actions

## 🤝 Contributing

This is an educational project. Contributions are welcome:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is for educational and demonstration purposes.

## 👥 Authors

Developed as part of a university project for attendance management system.

## 📞 Support

For issues or questions:
- Check existing documentation
- Review code comments
- Open an issue in the repository

## 🎯 Version

**Current Version:** 1.1.0

### Recent Updates (v1.1.0)
- ✅ Added half-day leave functionality
- ✅ Morning/Afternoon period selection for half-day leaves
- ✅ Enhanced leave request UI with duration toggle
- ✅ Updated all leave displays to show half-day information
- ✅ Calendar integration for half-day leaves
- ✅ HR Dashboard support for half-day leave tracking

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)

---

**Built with ❤️ using React Native and Expo**
