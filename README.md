# Attendance App - React Native + Expo

A complete attendance tracking application built with React Native and Expo SDK 54, featuring role-based authentication, camera integration, location tracking, and CSV export functionality.

## Features

### Authentication
- Simple text-based user authentication using `users.txt`
- Role-based access (Employee/Admin)
- Session management with AsyncStorage

### Employee Features
- **Check In/Check Out**: Mark attendance with photo verification
- **Camera Integration**: Take selfie photos for attendance verification
- **Location Tracking**: GPS coordinates captured with permission
- **Attendance History**: View personal attendance records with filtering
- **Modern UI**: Clean, card-based interface with smooth animations

### Admin Features
- **View All Records**: See attendance records from all employees
- **Search & Filter**: Find records by username, type, or date
- **CSV Export**: Export all attendance data to CSV format
- **Data Management**: Clear all records functionality
- **Statistics**: Overview of total records, check-ins, and check-outs

## Demo Credentials

```
Employee: testuser / testuser123
Admin: testadmin / testadmin123
```

## Tech Stack

- **React Native** with Expo SDK 54
- **React Navigation** for navigation
- **NativeWind** (Tailwind CSS for React Native) for styling
- **Expo Camera** for photo capture
- **Expo Location** for GPS tracking
- **Expo File System** for file operations
- **AsyncStorage** for local data persistence
- **Expo Vector Icons** for UI icons

## Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Development Server**
   ```bash
   npm start
   ```

3. **Run on Device/Simulator**
   - Install Expo Go app on your device
   - Scan the QR code from the terminal
   - Or press `i` for iOS simulator, `a` for Android emulator

## Project Structure

```
├── App.js                 # Main app component with navigation
├── screens/               # Screen components
│   ├── LoginScreen.js     # Authentication screen
│   ├── EmployeeDashboard.js # Employee main dashboard
│   ├── AdminDashboard.js  # Admin main dashboard
│   ├── AttendanceHistory.js # Attendance records list
│   └── CameraScreen.js    # Camera for photo capture
├── utils/                 # Utility functions
│   ├── auth.js           # Authentication logic
│   ├── storage.js        # AsyncStorage operations
│   └── export.js         # CSV export functionality
├── users.txt             # User credentials file
└── assets/               # App assets (icons, splash screens)
```

## Key Features Explained

### Authentication System
- Uses a simple `users.txt` file for user credentials
- Format: `username,password:password123,role:employee`
- No backend required - all authentication is local

### Attendance Tracking
- Each attendance record includes:
  - Timestamp
  - User information
  - Check-in/Check-out type
  - GPS coordinates (if permission granted)
  - Selfie photo
- Data stored locally using AsyncStorage

### Camera Integration
- Uses Expo Camera API for photo capture
- Front-facing camera for selfie verification
- Photos stored locally with attendance records

### Location Services
- Requests location permission on first use
- Captures GPS coordinates with each attendance record
- Graceful fallback if location permission denied

### CSV Export
- Exports all attendance data to CSV format
- Includes username, date, time, type, coordinates, and photo status
- Files saved to device's document directory

## Permissions Required

- **Camera**: For taking attendance photos
- **Location**: For GPS tracking (optional but recommended)

## Development Notes

- Built for Expo Go compatibility (no native code)
- Uses modern React Native patterns and hooks
- Responsive design with NativeWind styling
- Error handling and user feedback throughout
- Clean, maintainable code structure

## Future Enhancements

- Push notifications for attendance reminders
- Offline sync capabilities
- Advanced reporting and analytics
- Multi-language support
- Biometric authentication
- Cloud backup integration

## License

This project is for educational and demonstration purposes.
