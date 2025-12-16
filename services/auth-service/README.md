# Auth Service

Microservice responsible for handling all authentication-related operations using Firebase Admin SDK.

## Architecture

This is a **trusted backend service** with admin privileges. It uses Firebase Admin SDK (not client SDK or REST APIs) to:
- Access Firestore with admin privileges
- Manage Firebase Auth users
- Perform operations that require elevated permissions

## Setup

### 1. Install Dependencies

```bash
cd services/auth-service
npm install
```

### 2. Configure Service Account Credentials

The service requires Firebase service account credentials to initialize the Admin SDK.

#### Option 1: Service Account JSON File (Recommended for Development)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `attendanceapp-8c711`
3. Go to **Project Settings** > **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file as `serviceAccountKey.json` in `services/auth-service/`
6. Set environment variable:
   ```bash
   # Windows PowerShell
   $env:GOOGLE_APPLICATION_CREDENTIALS="D:\University\Workspace\Clone_App\AttendanceApp\services\auth-service\serviceAccountKey.json"
   
   # Linux/Mac
   export GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"
   ```

#### Option 2: Environment Variables (Recommended for Production)

1. Extract credentials from service account JSON:
   - `client_email`
   - `private_key`
2. Set environment variables:
   ```bash
   GOOGLE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@attendanceapp-8c711.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

#### Option 3: Using .env File

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and add your credentials (see Option 1 or 2 above)

### 3. Start the Server

```bash
npm start
# or
npm run dev
```

The server will start on port 3001 (or the port specified in the `PORT` environment variable).

## Endpoints

- `GET /health` - Health check endpoint
- `GET /` - Service information
- `POST /api/auth/login` - Authenticate user (verifies user exists, returns user data)
- `GET /api/auth/check-username/:username` - Check if username exists
- `POST /api/auth/users` - Create new user
- `PATCH /api/auth/users/:username/role` - Update user role
- `PATCH /api/auth/users/:username` - Update user info

## Important Notes

### Password Verification

Firebase Admin SDK **cannot verify passwords directly**. The current implementation:
- Verifies the user exists in Firebase Auth
- Returns user data from Firestore
- Does NOT verify the password server-side

**For production**, consider:
1. Using Firebase Auth REST API for password verification, OR
2. Implementing custom password verification, OR
3. Using Firebase Auth client SDK on frontend and verifying ID tokens on backend

### Security

- **DO NOT** commit service account credentials to version control
- Add `serviceAccountKey.json` and `.env` to `.gitignore`
- Use environment variables for credentials in production
- Rotate service account keys regularly

## Troubleshooting

### Error: "Could not load the default credentials"

This means service account credentials are not configured. Solutions:

1. **Set GOOGLE_APPLICATION_CREDENTIALS environment variable:**
   ```bash
   # Windows PowerShell
   $env:GOOGLE_APPLICATION_CREDENTIALS="path\to\serviceAccountKey.json"
   
   # Linux/Mac
   export GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"
   ```

2. **Or set individual credential fields:**
   ```bash
   GOOGLE_CLIENT_EMAIL=your-email@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="your-private-key"
   ```

3. **Or use .env file** (see Setup section above)

### Error: "Permission denied"

Ensure your service account has the following roles in Firebase:
- Firebase Admin SDK Administrator Service Agent
- Cloud Datastore User

## Configuration

Set environment variables in a `.env` file (optional):

```env
PORT=3001
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
```

## Next Steps

- [ ] Implement proper password verification
- [ ] Add rate limiting
- [ ] Add request validation
- [ ] Add logging and monitoring
- [ ] Add unit tests
