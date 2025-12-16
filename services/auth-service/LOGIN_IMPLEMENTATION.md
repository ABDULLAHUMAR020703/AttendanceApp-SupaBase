# Login Endpoint Implementation Details

## Architecture Decision

The `/api/auth/login` endpoint uses a **hybrid approach** combining:
- **Firebase Admin SDK** for Firestore operations (trusted backend with admin privileges)
- **Firebase Auth REST API** for password verification (Admin SDK limitation)

## Why This Approach?

### Problem
Firebase Admin SDK **cannot verify passwords directly**. It can:
- ✅ Create users
- ✅ Get user information
- ✅ Update user data
- ❌ **NOT verify passwords**

### Solution
Use the right tool for each operation:
1. **Admin SDK** for Firestore access (trusted backend operation)
2. **REST API** for password verification (only operation Admin SDK cannot do)

## Login Flow

```
1. Accept username/email + password
   ↓
2. If username (not email):
   - Use Admin SDK to query Firestore
   - Find user by username
   - Get email from Firestore document
   ↓
3. Verify password:
   - Use Firebase Auth REST API (signInWithPassword)
   - This is the ONLY REST API call
   ↓
4. If password correct:
   - Use Admin SDK to get user data from Firestore
   - Return user information
   ↓
5. If password incorrect:
   - Return authentication error
```

## Code Breakdown

### Step 1: Username Resolution (Admin SDK)
```javascript
// If username, resolve email using Admin SDK + Firestore
if (!usernameOrEmail.includes('@')) {
  const usersRef = db.collection('users');
  const querySnapshot = await usersRef
    .where('username', '==', usernameOrEmail)
    .limit(1)
    .get();
  // Get email from Firestore document
}
```

**Why Admin SDK?**
- Trusted backend operation
- Admin privileges allow querying Firestore
- No security rules restrictions
- More efficient than REST API

### Step 2: Password Verification (REST API)
```javascript
// Verify password using Firebase Auth REST API
const authResponse = await axios.post(
  `${FIREBASE_AUTH_URL}?key=${FIREBASE_API_KEY}`,
  {
    email: email,
    password: password,
    returnSecureToken: true,
  }
);
```

**Why REST API?**
- Admin SDK cannot verify passwords
- REST API is the only way to verify passwords server-side
- Returns user ID if password is correct
- Handles all Firebase Auth error codes

### Step 3: User Data Retrieval (Admin SDK)
```javascript
// Get user data from Firestore using Admin SDK
const userDoc = await db.collection('users').doc(localId).get();
const userData = userDoc.data();
```

**Why Admin SDK?**
- Trusted backend operation
- Direct Firestore access
- No security rules restrictions
- More efficient than REST API

## Security Considerations

### ✅ Secure
- Passwords are verified using Firebase Auth REST API
- Firestore access uses Admin SDK (trusted backend)
- No passwords stored or logged
- Proper error handling for all cases

### ✅ Firestore Security Rules
- Admin SDK bypasses security rules (trusted backend)
- No need to loosen Firestore security rules
- Frontend still protected by security rules

### ✅ API Key Usage
- API key is only used for password verification
- Not used for Firestore access (uses Admin SDK)
- API key is server-side only (not exposed to frontend)

## Error Handling

The implementation handles:
- ✅ Invalid username/email
- ✅ Invalid password
- ✅ User not found
- ✅ User disabled
- ✅ Too many attempts
- ✅ Network errors
- ✅ Server errors

## Dependencies

- `firebase-admin` - For Firestore and user management (Admin SDK)
- `axios` - For password verification (REST API call only)

## API Contract

**Request:**
```json
{
  "usernameOrEmail": "testuser",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "uid": "firebase-uid",
    "username": "testuser",
    "email": "test@example.com",
    "role": "employee",
    "name": "Test User",
    "department": "Engineering",
    "position": "Developer",
    "workMode": "in_office"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Invalid username or password"
}
```

## Why Not Use REST API for Firestore?

1. **Security**: Admin SDK is a trusted backend with admin privileges
2. **Efficiency**: Direct Firestore access is faster than REST API
3. **Security Rules**: Admin SDK bypasses rules (appropriate for backend)
4. **Architecture**: Backend should use Admin SDK, not REST API

## Why Not Use Admin SDK for Password Verification?

**Because it's impossible** - Firebase Admin SDK does not provide password verification functionality. The REST API is the only server-side option.

## Summary

- ✅ **Admin SDK** for Firestore operations (username lookup, user data retrieval)
- ✅ **REST API** for password verification (only operation Admin SDK cannot do)
- ✅ **Secure** - Passwords are properly verified
- ✅ **Efficient** - Uses the right tool for each operation
- ✅ **Maintainable** - Clear separation of concerns

