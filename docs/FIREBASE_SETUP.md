# Firebase Setup Guide

This guide will help you set up Firebase for the Attendance App. The app now uses Firebase Authentication and Firestore for all user management, replacing the local file-based system.

## Prerequisites

- A Firebase account (create one at [firebase.google.com](https://firebase.google.com))
- Node.js and npm installed
- The Attendance App project set up

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard:
   - Enter a project name (e.g., "Attendance App")
   - Enable/disable Google Analytics (optional)
   - Click "Create project"

## Step 2: Enable Firebase Authentication

1. In your Firebase project, go to **Authentication** in the left sidebar
2. Click **Get Started**
3. Go to the **Sign-in method** tab
4. Enable **Email/Password** authentication:
   - Click on "Email/Password"
   - Toggle "Enable" to ON
   - Click "Save"

## Step 3: Set Up Firestore Database

1. In your Firebase project, go to **Firestore Database** in the left sidebar
2. Click **Create database**
3. Choose **Start in test mode** (for development) or **Start in production mode** (for production)
4. Select a location for your database (choose the closest to your users)
5. Click **Enable**

### Set Up Firestore Security Rules (Important!)

**You must configure Firestore security rules to fix "Missing or insufficient permissions" errors.**

Go to **Firestore Database** > **Rules** tab and use one of the following:

**For Development (Permissive - Use only during development):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Employees collection
    match /employees/{employeeId} {
      allow read, write: if request.auth != null;
    }
    
    // Sign-up requests collection
    match /signup_requests/{requestId} {
      allow read: if request.auth != null && 
                     (request.auth.token.role == 'super_admin' || 
                      request.auth.token.role == 'manager');
      allow create: if true; // Anyone can create sign-up requests
      allow update, delete: if request.auth != null && 
                              (request.auth.token.role == 'super_admin' || 
                               request.auth.token.role == 'manager');
    }
    
    // Default: deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**For Production (Recommended - Authenticated access):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                     (request.auth.token.role == 'super_admin' || 
                      request.auth.token.role == 'manager');
    }
    
    // Employees collection
    match /employees/{employeeId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                     (request.auth.token.role == 'super_admin' || 
                      request.auth.token.role == 'manager');
    }
    
    // Sign-up requests collection
    match /signup_requests/{requestId} {
      allow read: if request.auth != null && 
                     (request.auth.token.role == 'super_admin' || 
                      request.auth.token.role == 'manager');
      allow create: if true; // Anyone can create sign-up requests
      allow update, delete: if request.auth != null && 
                              (request.auth.token.role == 'super_admin' || 
                               request.auth.token.role == 'manager');
    }
    
    // Default: deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Important**: After updating the rules, click **Publish** to apply them.

## Step 4: Get Your Firebase Configuration

1. In your Firebase project, click the gear icon ⚙️ next to "Project Overview"
2. Select **Project settings**
3. Scroll down to **Your apps** section
4. Click the **Web** icon (`</>`) to add a web app
5. Register your app with a nickname (e.g., "Attendance App")
6. Copy the Firebase configuration object

## Step 5: Configure Firebase in the App

1. Open `config/firebase.js` in your project
2. Replace the placeholder values with your Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID" // Optional
};
```

3. Save the file

## Step 6: Install Firebase Dependencies

Firebase is already included in `package.json`, but if you need to reinstall:

```bash
npm install firebase
```

## Step 7: Test the Integration

1. Start your app:
   ```bash
   npm start
   ```

2. The app will automatically:
   - Use Firebase Authentication for login
   - Store user data in Firestore
   - Handle authentication state changes

3. Check the console logs for:
   - "Firebase initialized successfully"
   - Any error messages

## How It Works

### Authentication Flow

1. **User Login**:
   - User enters username or email and password
   - App authenticates with Firebase Authentication
   - If username is used, app looks up email in Firestore
   - Firebase handles password verification

2. **User Signup**:
   - User submits signup request
   - Admin approves request
   - User account is created in Firebase Authentication
   - User document is created in Firestore with role, username, etc.

3. **Session Management**:
   - Firebase automatically handles session persistence
   - Uses AsyncStorage internally for auth state
   - `onAuthStateChanged` listener updates app state

### Data Storage

- **Firebase Authentication**: Stores email/password credentials
- **Firestore `users` collection**: Stores complete user data:
  - `uid` - Firebase Auth UID
  - `username` - Login username
  - `email` - Email address
  - `name` - Full name
  - `role` - employee, manager, or super_admin
  - `department` - Department name
  - `position` - Job title/position
  - `workMode` - in_office, semi_remote, or fully_remote
  - `hireDate` - Date hired (YYYY-MM-DD)
  - `isActive` - Active status
  - `createdAt` - Creation timestamp
  - `updatedAt` - Last update timestamp
- **AsyncStorage**: Only used for app settings and attendance records (not users)

### Migration from File-Based System

The app has been migrated from local file storage to Firebase:
- ❌ No more `users.txt` file operations
- ❌ No more FileSystem for user storage
- ✅ All users stored in Firebase
- ✅ Automatic sync across devices
- ✅ Built-in offline support

## Creating Initial Users

Since the app no longer uses `users.txt`, you need to create initial users in Firebase:

### Option 1: Through the App

1. Use the "Create User" feature in the admin dashboard
2. Or approve signup requests

### Option 2: Through Firebase Console

1. Go to **Authentication** > **Users**
2. Click **Add user**
3. Enter email and password
4. Then go to **Firestore Database** > **users** collection
5. Create a document with the user's UID and add:
   ```json
   {
     "username": "testuser",
     "email": "testuser@example.com",
     "name": "Test User",
     "role": "employee",
     "department": "Engineering",
     "position": "AI Engineer",
     "workMode": "in_office",
     "hireDate": "2023-01-15",
     "isActive": true,
     "createdAt": "2024-01-01T00:00:00.000Z",
     "updatedAt": "2024-01-01T00:00:00.000Z"
   }
   ```

### Option 3: Migrate from users.txt (Recommended for Initial Setup)

Use the migration utility to import all users from `users.txt`:

1. Import the migration function in your app:
   ```javascript
   import { migrateUsersFromFile } from './utils/migrateUsers';
   ```

2. Call it from your admin dashboard or create a temporary button:
   ```javascript
   const handleMigrate = async () => {
     Alert.alert('Migrate Users', 'This will create all users from users.txt. Continue?', [
       { text: 'Cancel', style: 'cancel' },
       { 
         text: 'Migrate', 
         onPress: async () => {
           const result = await migrateUsersFromFile();
           Alert.alert(
             'Migration Complete', 
             `Created ${result.success} of ${result.total} users`
           );
         }
       }
     ]);
   };
   ```

3. The migration will:
   - Create Firebase Authentication accounts for all users
   - Create Firestore documents with complete user data
   - Include all fields: username, email, name, role, department, position, workMode, hireDate

## Troubleshooting

### "Missing or insufficient permissions" Error

- Check your Firestore security rules
- Make sure rules are published
- Verify user is authenticated

### "User not found" Error

- Check if user exists in Firebase Authentication
- Verify user document exists in Firestore `users` collection
- Check if username field matches in Firestore

### Authentication Not Working

- Verify Firebase configuration in `config/firebase.js`
- Check Firebase project settings
- Ensure Email/Password authentication is enabled
- Check console for error messages

## Security Best Practices

1. **Use Production Security Rules**: Don't use test mode in production
2. **Enable Email Verification**: Consider enabling email verification in Firebase
3. **Strong Passwords**: Enforce strong password requirements
4. **Role-Based Access**: Use custom claims for role-based access control
5. **Regular Backups**: Set up Firestore backups

## Support

For more information, visit:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)

