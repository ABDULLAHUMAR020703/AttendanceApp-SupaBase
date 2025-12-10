# TODO - Firebase Migration & App Improvements

## ✅ Completed

### Firebase Migration
- [x] Updated `config/firebase.js` with Firebase configuration
- [x] Migrated `contexts/AuthContext.js` to use Firebase `onAuthStateChanged`
- [x] Migrated `utils/auth.js` to use Firebase Authentication and Firestore
- [x] Removed all FileSystem operations for user storage
- [x] Updated `utils/signupRequests.js` to create Firebase users on approval
- [x] Updated `utils/employees.js` to use Firebase for user creation
- [x] Removed `initializeUsersFile()` from App.js
- [x] Created `FIREBASE_SETUP.md` documentation
- [x] Removed old markdown files (SYNC_USERS.md, LOGO_SETUP.md, old FIREBASE_SETUP.md, todo.md)

## 🔄 In Progress / Needs Verification

### Firebase Setup Verification
- [ ] Verify Firebase project is created and configured
- [ ] Verify Email/Password authentication is enabled in Firebase Console
- [ ] Verify Firestore database is created
- [ ] Verify Firestore security rules are set up (see FIREBASE_SETUP.md)
- [ ] Test login with existing users
- [ ] Test signup request approval flow
- [ ] Test user creation from admin dashboard

### Code Cleanup
- [ ] Remove unused FileSystem imports from `utils/signupRequests.js` (if signup requests should also use Firestore)
- [ ] Consider migrating signup requests to Firestore instead of AsyncStorage
- [ ] Remove any remaining references to `users.txt` file operations
- [ ] Clean up unused functions in `utils/auth.js` if any

## 📋 To Do

### Initial User Setup
- [ ] Create initial admin user in Firebase Console
- [ ] Create test users for development
- [ ] Document how to create users manually in Firebase Console

### Testing
- [ ] Test complete authentication flow (login, logout)
- [ ] Test signup request creation and approval
- [ ] Test user creation from admin dashboard
- [ ] Test role updates
- [ ] Test username and email login (both should work)
- [ ] Test offline functionality (Firebase handles this automatically)

### Documentation
- [ ] Update README.md to reflect Firebase migration
- [ ] Add migration guide for existing users (if any)
- [ ] Document how to migrate existing `users.txt` users to Firebase

### Optional Enhancements
- [ ] Add email verification for new users
- [ ] Add password reset functionality
- [ ] Consider using Firebase custom claims for roles (more secure)
- [ ] Add Firebase Analytics (optional)
- [ ] Set up Firestore backups
- [ ] Add error handling for Firebase connection issues

## 🐛 Known Issues / Notes

- Signup requests still use AsyncStorage and FileSystem backup (consider migrating to Firestore)
- Need to verify Firestore security rules work correctly with role-based access
- Need to test that username login works correctly (looks up email in Firestore)

## 📝 Notes

- All user authentication now uses Firebase
- No more local file storage for users
- Firebase automatically handles session persistence
- Users can login with either username or email
- All user data is stored in Firestore `users` collection

