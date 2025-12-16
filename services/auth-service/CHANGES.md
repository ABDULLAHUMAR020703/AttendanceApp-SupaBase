# Changes Summary: Firebase Admin SDK Restoration

## What Was Reverted

### 1. Removed Firebase REST API Implementation
- **Removed**: All Firebase REST API calls using `axios`
- **Removed**: `queryFirestore()` function that used Firestore REST API
- **Removed**: `getFirestoreDocument()` function that used Firestore REST API
- **Removed**: Firebase Auth REST API password verification
- **Removed**: `axios` dependency from `package.json`
- **Removed**: Firebase API key and REST API URLs from routes

### 2. Removed REST API Configuration
- **Removed**: `FIREBASE_API_KEY` constant
- **Removed**: `FIREBASE_AUTH_URL` constant
- **Removed**: `FIRESTORE_URL` constant
- **Removed**: All REST API-related code from `routes/auth.js`

## What Was Added

### 1. Firebase Admin SDK Integration
- **Added**: `firebase-admin` dependency to `package.json`
- **Added**: Firebase Admin SDK initialization in `config/firebase.js`
- **Added**: Service account credential support via environment variables
- **Added**: Support for three credential methods:
  1. `GOOGLE_APPLICATION_CREDENTIALS` (path to JSON file)
  2. Individual credential fields (`GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`)
  3. `applicationDefault()` for GCP environments

### 2. Admin SDK Implementation in Routes
- **Updated**: `/api/auth/login` - Now uses Admin SDK:
  - `db.collection('users').where()` for username lookup
  - `auth.getUser()` or `auth.getUserByEmail()` for user verification
  - `db.collection('users').doc().get()` for user data retrieval

- **Updated**: `/api/auth/check-username/:username` - Now uses Admin SDK:
  - `db.collection('users').where('username', '==', username).get()`

- **Updated**: `/api/auth/users` (POST) - Now uses Admin SDK:
  - `auth.createUser()` to create Firebase Auth user
  - `db.collection('users').doc().set()` to create Firestore document

- **Updated**: `/api/auth/users/:username/role` (PATCH) - Now uses Admin SDK:
  - `db.collection('users').where().get()` to find user
  - `db.collection('users').doc().update()` to update role

- **Updated**: `/api/auth/users/:username` (PATCH) - Now uses Admin SDK:
  - `db.collection('users').where().get()` to find user
  - `db.collection('users').doc().update()` to update user info

### 3. Configuration Files
- **Added**: `.env.example` - Template for service account credentials
- **Added**: `.gitignore` - Excludes credentials and sensitive files
- **Updated**: `README.md` - Complete setup instructions for Admin SDK

### 4. Security Improvements
- **Added**: Credential validation and error handling
- **Added**: Proper initialization checks
- **Added**: Security warnings in documentation

## Important Notes

### Password Verification Limitation
Firebase Admin SDK **cannot verify passwords directly**. The current `/api/auth/login` implementation:
- Verifies user exists in Firebase Auth
- Returns user data from Firestore
- Does NOT verify password server-side

**For production**, consider:
1. Using Firebase Auth REST API for password verification, OR
2. Implementing custom password verification, OR
3. Using Firebase Auth client SDK on frontend and verifying ID tokens on backend

### API Contracts Unchanged
All API endpoints maintain the same:
- Request/response formats
- HTTP status codes
- Error messages
- Endpoint paths

No changes to:
- API Gateway
- Frontend code
- API contracts

## Setup Required

1. **Install dependencies:**
   ```bash
   cd services/auth-service
   npm install
   ```

2. **Configure service account credentials** (see README.md for details):
   - Option 1: Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable
   - Option 2: Set `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY` environment variables
   - Option 3: Use `.env` file

3. **Start the service:**
   ```bash
   npm start
   ```

## Files Modified

- `services/auth-service/package.json` - Added firebase-admin, removed axios
- `services/auth-service/config/firebase.js` - Complete rewrite for Admin SDK
- `services/auth-service/routes/auth.js` - Complete rewrite using Admin SDK
- `services/auth-service/README.md` - Updated with Admin SDK setup
- `services/auth-service/.env.example` - New file for credential template
- `services/auth-service/.gitignore` - New file for security

## Files Deleted

- `services/auth-service/SETUP.md` - Removed (outdated REST API documentation)

