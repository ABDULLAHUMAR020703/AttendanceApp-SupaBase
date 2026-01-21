# Hadir.AI - Employee Attendance Management System

A comprehensive employee attendance management system built with React Native, Expo, and Supabase. Features role-based access control, real-time attendance tracking, leave management, ticket system, and comprehensive analytics.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![React Native](https://img.shields.io/badge/react--native-0.81.5-blue.svg)](https://reactnative.dev/)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-black?logo=github)](https://github.com/ABDULLAHUMAR020703/AttendanceApp-SupaBase)

---

## ✨ Features

### 🔐 Authentication & Security
- **Multiple Authentication Methods**
  - Username/Email + Password
  - Biometric authentication (Face ID, Fingerprint)
  - Session persistence with AsyncStorage
- **Password Management**
  - Self-service password change (requires current password)
  - Forgot password flow with email reset
  - Secure password reset via deep linking
  - No password storage in database (Supabase Auth only)
- **Role-Based Access Control**
  - Super Admin: Full system access
  - Manager: Department-level management
  - Employee: Self-service features

### 📊 Core Features
- **Attendance Tracking**
  - GPS-based check-in/check-out
  - Location verification with geofencing
  - Office location management (admin/HR)
  - Automatic check-out when leaving office radius (configurable)
  - Attendance history and analytics
  - Manual attendance entry (for managers/admins)

- **Leave Management**
  - Annual, Sick, and Casual leave types
  - Leave request workflow
  - Manager approval system
  - Leave balance tracking

- **Ticket System**
  - Support ticket creation
  - Automatic department routing
  - Priority levels and status tracking
  - Manager assignment

- **Calendar & Events**
  - Create and manage calendar events
  - Event visibility settings (All, None, Selected users)
  - Supabase storage for data consistency
  - Automatic refresh on screen focus
  - Role-based employee filtering

- **Help & Support**
  - Contact support via email
  - Production-safe email handling (works in APK builds)
  - Fallback modal with copy-to-clipboard
  - Pre-filled email with user details

- **Analytics & Reporting**
  - Personal attendance analytics
  - Department-level statistics
  - System-wide reports
  - CSV export functionality

### 🎨 User Experience
- **Modern UI/UX**
  - Dark mode support
  - Responsive design
  - Intuitive navigation
  - Smooth animations

- **Offline Support**
  - Local data caching with AsyncStorage
  - Offline-first approach
  - Automatic sync when online
  - Calendar events stored in Supabase (AsyncStorage fallback)

- **Real-Time Updates**
  - Supabase Realtime subscriptions
  - Live notification updates
  - Real-time attendance record synchronization
  - Instant work mode change notifications
  - Calendar events refresh on screen focus

---

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- React Native 0.81.5
- Expo SDK ~54.0.25
- React Navigation 6.x
- NativeWind (Tailwind CSS)
- AsyncStorage for local persistence

**Backend:**
- Node.js 18+
- Express.js 5.2.1
- Microservices architecture (API Gateway + Auth Service)

**Database & Auth:**
- Supabase (PostgreSQL + Authentication)
- Row Level Security (RLS) policies
- Deep linking for password reset (`hadirai://reset-password`)

### System Architecture

```
Mobile App (React Native/Expo)
    ↓
API Gateway (Port 3000)
    ↓
Auth Service (Port 3001)
    ↓
Supabase (PostgreSQL + Auth)
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Supabase account ([sign up free](https://supabase.com))

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ABDULLAHUMAR020703/AttendanceApp-SupaBase.git
   cd AttendanceApp-SupaBase
   ```

2. **Install dependencies:**
   ```bash
   # Root dependencies
   npm install

   # Backend services
   cd services/api-gateway && npm install && cd ../..
   cd services/auth-service && npm install && cd ../..

   # Mobile app
   cd apps/mobile && npm install && cd ../..
   ```

3. **Set up environment variables:**
   
   Copy `.env.example` files to `.env` and fill in your Supabase credentials:
   
   ```bash
   # Backend
   cd services/auth-service
   copy .env.example .env    # Windows
   # OR
   cp .env.example .env      # Linux/macOS
   
   # Frontend
   cd ../../apps/mobile
   copy .env.example .env    # Windows
   # OR
   cp .env.example .env      # Linux/macOS
   ```
   
   **Important:** Configure deep linking in `apps/mobile/app.json`:
   ```json
   {
     "expo": {
       "scheme": "hadirai",
       "extra": {
         "supabaseRedirectUrl": "hadirai://reset-password"
       }
     }
   }
   ```
   
   See [SETUP.md](SETUP.md) for detailed instructions on getting Supabase credentials.

4. **Set up Supabase database:**
   
   Create users via script:
   ```bash
   # Option 1: Automated user creation (recommended)
   node scripts/create-new-users-automated.js
   
   # Option 2: Manual user creation
   node scripts/create-users-supabase.js
   ```
   
   See `scripts/README_AUTOMATED_USER_CREATION.md` for detailed instructions.

5. **Start the services:**
   
   **Windows:**
   ```powershell
   .\start-services.ps1
   ```
   
   **Linux/macOS:**
   ```bash
   ./start-services.sh
   ```

6. **Start the mobile app:**
   ```bash
   cd apps/mobile
   npm start
   ```

For detailed setup instructions, see [SETUP.md](SETUP.md).

---

## 📱 Running the App

### Development

1. **Start backend services** (API Gateway + Auth Service)
2. **Start Expo development server:**
   ```bash
   cd apps/mobile
   npm start
   ```
3. **Open on device/simulator:**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app (physical device)
   - Press `w` for web browser

### Testing on Physical Device

1. Ensure device and computer are on the same WiFi network
2. Update `apps/mobile/app.json` with your computer's IP:
   ```json
   {
     "expo": {
       "scheme": "hadirai",
       "extra": {
         "apiGatewayUrl": "http://YOUR_IP_ADDRESS:3000",
         "supabaseRedirectUrl": "hadirai://reset-password"
       }
     }
   }
   ```
3. Restart Expo server after updating `app.json`
4. **For password reset:** Add `hadirai://reset-password` to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

---

## 🔧 Configuration

### Environment Variables

#### Backend (`services/auth-service/.env`)
```env
PORT=3001
HOST=0.0.0.0
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Frontend (`apps/mobile/.env`)
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### Frontend (`apps/mobile/app.json`)
```json
{
  "expo": {
    "scheme": "hadirai",
    "extra": {
      "apiGatewayUrl": "http://localhost:3000",
      "supabaseRedirectUrl": "hadirai://reset-password"
    }
  }
}
```

**Important:** 
- Backend uses `service_role` key (secret, admin privileges)
- Frontend uses `anon` key (public, safe for client)
- Frontend variables must have `EXPO_PUBLIC_` prefix
- Deep linking scheme `hadirai` is required for password reset flow
- Add `hadirai://reset-password` to Supabase Dashboard → Authentication → URL Configuration

See `.env.example` files in each directory for detailed instructions.

---

## 📂 Project Structure

```
AttendanceApp-SupaBase/
├── apps/
│   └── mobile/              # React Native/Expo mobile app
│       ├── core/            # Core infrastructure
│       ├── features/        # Feature modules
│       ├── shared/          # Shared components/utilities
│       └── screens/         # Screen components
│
├── services/
│   ├── api-gateway/         # API Gateway (port 3000)
│   └── auth-service/        # Auth Service (port 3001)
│
├── scripts/
│   ├── create-users-supabase.js          # Manual user creation script
│   ├── create-new-users-automated.js     # Automated user creation script
│   └── README_AUTOMATED_USER_CREATION.md # User creation documentation
│
├── migrations/                    # Database migration scripts
│   ├── 004_create_leave_requests_table.sql
│   ├── 005_create_tickets_table.sql
│   ├── 006_create_attendance_records_table.sql
│   ├── 008_create_calendar_events_table.sql
│   ├── 019_add_calendar_event_visibility.sql
│   └── ... (additional migration files)
│
├── docs/                    # Documentation
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── TECHNICAL_DOCUMENTATION.md
│   ├── APP_FEATURES.md
│   ├── MODULAR_ARCHITECTURE.md
│   └── STRUCTURE_SUMMARY.md
├── SETUP.md                 # Detailed setup guide
└── README.md                # This file
```

---

## 👥 User Roles

### Super Admin
- Full system access
- Create and manage all users
- View all departments and employees
- System-wide analytics

### Manager
- Department-level access
- Manage employees in their department
- Approve leave requests
- View department analytics

### Employee
- Personal dashboard
- Check in/out
- Submit leave requests
- Create support tickets
- View personal analytics
- Change password (self-service)
- Reset password via email
- Create and view calendar events

---

## 🔐 Default Login Credentials

After running the user creation script:

- **Super Admin:** `testadmin` / `testadmin123`
- **Manager:** `techmanager` / `techmanager123`
- **Employee:** `testuser` / `testuser123`

See `scripts/README_AUTOMATED_USER_CREATION.md` for all demo users and creation instructions.

---

## 📚 Documentation

- **[SETUP.md](SETUP.md)** - Complete setup guide
- **[docs/TECHNICAL_DOCUMENTATION.md](docs/TECHNICAL_DOCUMENTATION.md)** - Technical details and API documentation
- **[docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md)** - System architecture and user management
- **[docs/APP_FEATURES.md](docs/APP_FEATURES.md)** - Complete feature documentation
- **[docs/MODULAR_ARCHITECTURE.md](docs/MODULAR_ARCHITECTURE.md)** - Code structure and migration status
- **[docs/STRUCTURE_SUMMARY.md](docs/STRUCTURE_SUMMARY.md)** - Quick reference for code organization

---

## 🛠️ Development

### Running Services

**Backend Services:**
```bash
# Using start script (recommended)
.\start-services.ps1    # Windows
./start-services.sh     # Linux/macOS

# Or manually
cd services/api-gateway && npm start
cd services/auth-service && npm start
```

**Mobile App:**
```bash
cd apps/mobile
npm start
```

### Code Structure

- **Modular Architecture:** Feature-based code organization
- **Microservices:** API Gateway pattern for backend services
- **Type Safety:** Consistent data structures and error handling
- **Best Practices:** Comprehensive error handling and logging

---

## 🐛 Troubleshooting

### Common Issues

**Backend services won't start:**
- Check ports 3000 and 3001 are available
- Verify `.env` files exist and have correct values
- Ensure dependencies are installed

**Mobile app can't connect:**
- Verify backend services are running
- Check API Gateway URL is correct for your platform
- For physical devices: Ensure same WiFi network

**Supabase connection fails:**
- Verify credentials in `.env` files
- Check Supabase project is active
- Ensure users exist in Supabase Auth

**Password reset not working:**
- Verify deep linking scheme `hadirai` is configured in `app.json`
- Add `hadirai://reset-password` to Supabase Dashboard → Authentication → URL Configuration
- Check email link opens the app correctly

**Calendar events not showing:**
- Verify `calendar_events` table exists in Supabase
- Check RLS policies are configured correctly
- Ensure events refresh on screen focus

See [SETUP.md](SETUP.md) for detailed troubleshooting.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) - Backend as a Service
- [Expo](https://expo.dev) - React Native development platform
- [React Native](https://reactnative.dev) - Mobile framework

---

## 📞 Support

For issues and questions:
- Check [SETUP.md](SETUP.md) for setup help
- Review [docs/](docs/) for detailed documentation
- Open an issue on [GitHub](https://github.com/ABDULLAHUMAR020703/AttendanceApp-SupaBase/issues)

---

**Built with ❤️ using React Native, Expo, and Supabase**

---

*Last Updated: 2025-01-27*
