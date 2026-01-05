# API Gateway Service

Express server that acts as the entry point for all client requests, forwarding them to appropriate microservices.

## Setup

1. **Install Dependencies**
   ```bash
   cd services/api-gateway
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   # or
   npm run dev
   ```

The server will start on port 3000 (or the port specified in the `PORT` environment variable).

## Endpoints

- `GET /health` - Health check endpoint
- `GET /` - Service information
- `POST /api/auth/login` - Forward login requests to auth-service
- `GET /api/auth/check-username/:username` - Check username availability
- `POST /api/auth/users` - Create new user
- `PATCH /api/auth/users/:username/role` - Update user role
- `PATCH /api/auth/users/:username` - Update user info

## Configuration

Set environment variables in a `.env` file (for local development) or in Render Dashboard (for production):

### Local Development:
```env
PORT=3000
AUTH_SERVICE_URL=http://localhost:3001
REPORTING_SERVICE_URL=http://localhost:3002
```

### Render Production:
```env
AUTH_SERVICE_URL=https://attendanceapp-supabase.onrender.com
REPORTING_SERVICE_URL=https://reporting-service-ki0r.onrender.com
```

**Important:** For Render deployment, set these in Render Dashboard → Environment tab, not in `.env` file.

## Connecting from Mobile App

### iOS Simulator
- Use: `http://localhost:3000`
- Works automatically

### Android Emulator
- Use: `http://10.0.2.2:3000`
- This is the special IP that Android emulator uses to reach the host machine

### Physical Device
1. Find your computer's local IP address:
   - **Windows**: Run `ipconfig` and look for "IPv4 Address"
   - **Mac/Linux**: Run `ifconfig` or `ip addr` and look for your network interface IP
   
2. Update `apps/mobile/core/config/api.js`:
   ```javascript
   export const API_GATEWAY_URL = 'http://192.168.1.100:3000'; // Replace with your IP
   ```

3. Make sure your device and computer are on the same WiFi network

4. Ensure your firewall allows connections on port 3000

## Troubleshooting

### "Network request failed" Error

1. **Check if API Gateway is running:**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Check the URL in mobile app:**
   - iOS Simulator: `http://localhost:3000`
   - Android Emulator: `http://10.0.2.2:3000`
   - Physical Device: `http://<your-ip>:3000`

3. **Check firewall settings:**
   - Windows: Allow Node.js through firewall
   - Mac: System Preferences > Security & Privacy > Firewall

4. **Verify network connectivity:**
   - Physical device and computer must be on same WiFi network
   - Try accessing `http://<your-ip>:3000/health` from device browser

