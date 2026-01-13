# Auth Service

Microservice responsible for handling all authentication-related operations using Supabase.

## Architecture

This is a **trusted backend service** with admin privileges. It uses Supabase (with Service Role Key) to:
- Access PostgreSQL database with admin privileges
- Manage Supabase Auth users
- Perform operations that require elevated permissions

## Setup

### 1. Install Dependencies

```bash
cd services/auth-service
npm install
```

### 2. Configure Supabase Credentials

The service requires Supabase credentials to initialize the client.

#### Option 1: Environment Variables (Recommended)

Set the following environment variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3001
```

#### Option 2: Using .env File

1. Create a `.env` file in `services/auth-service/`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   PORT=3001
   ```

2. The service uses `dotenv` to load these variables automatically

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
- `POST /api/auth/login` - Authenticate user (verifies credentials, returns user data)
- `GET /api/auth/check-username/:username` - Check if username exists
- `POST /api/auth/users` - Create new user
- `PATCH /api/auth/users/:username/role` - Update user role
- `PATCH /api/auth/users/:username` - Update user info

## Implementation Details

### Authentication Flow

1. **Login** (`POST /api/auth/login`):
   - Accepts `usernameOrEmail` and `password`
   - Resolves username to email if needed
   - Authenticates using Supabase Auth (`signInWithPassword`)
   - Returns user data from `users` table

2. **User Creation** (`POST /api/auth/users`):
   - Creates user in Supabase Auth
   - Creates corresponding record in `users` table
   - Returns user data with generated UID

3. **Username Check** (`GET /api/auth/check-username/:username`):
   - Queries `users` table for username
   - Returns boolean indicating existence

### Security

- **DO NOT** commit service role keys to version control
- Add `.env` to `.gitignore`
- Use environment variables for credentials in production
- Service Role Key has admin privileges - keep it secure
- The service uses Service Role Key for admin operations (bypasses RLS)

## Troubleshooting

### Error: "Missing Supabase credentials"

Ensure environment variables are set:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Error: "Invalid API key"

Verify your Service Role Key is correct and has not been rotated.

### Error: "User not found"

- Verify the user exists in Supabase Auth
- Check that the `users` table has a corresponding record
- Ensure `uid` in `users` table matches Supabase Auth user ID

## Configuration

Set environment variables in a `.env` file:

```env
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Dependencies

- `express` - Web framework
- `@supabase/supabase-js` - Supabase client library
- `cors` - CORS middleware
- `dotenv` - Environment variable management

## Next Steps

- [ ] Add rate limiting
- [ ] Add request validation
- [ ] Add logging and monitoring
- [ ] Add unit tests
- [ ] Add API documentation (Swagger/OpenAPI)
