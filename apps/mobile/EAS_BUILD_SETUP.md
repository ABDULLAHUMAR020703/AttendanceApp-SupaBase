# EAS Build Setup Guide

## Problem: APK Crashes on Android Device

If your APK crashes immediately after installation, it's likely due to missing environment variables (Supabase credentials) in the production build.

## Solution: Set EAS Secrets

EAS builds require environment variables to be set as **secrets** using the EAS CLI. These secrets are securely stored and injected into your build.

### Step 1: Install EAS CLI (if not already installed)

```bash
npm install -g eas-cli
```

### Step 2: Login to EAS

```bash
eas login
```

### Step 3: Set Supabase Secrets

Navigate to your mobile app directory and set the secrets:

```bash
cd apps/mobile

# Set Supabase URL
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"

# Set Supabase Anon Key
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key-here"
```

**Important Notes:**
- Replace `https://your-project.supabase.co` with your actual Supabase project URL
- Replace `your-anon-key-here` with your actual Supabase anon/public key
- These secrets are stored securely and will be available for all future builds

### Step 4: Verify Secrets

To list all your secrets:

```bash
eas secret:list
```

### Step 5: Rebuild the APK

After setting the secrets, rebuild your APK:

```bash
eas build -p android --profile preview
```

## Alternative: Local Development Build

For local testing, create a `.env` file in `apps/mobile/`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Then run:

```bash
npx expo start
```

## Troubleshooting

### App Still Crashes After Setting Secrets

1. **Verify secrets are set correctly:**
   ```bash
   eas secret:list
   ```

2. **Check if secrets are being used:**
   - Secrets are automatically injected during EAS builds
   - Make sure you're building with EAS, not locally

3. **Check logs:**
   - Connect your device via USB
   - Use `adb logcat` to see crash logs:
     ```bash
     adb logcat | grep -i "error\|exception\|crash"
     ```

### Environment Variables Not Loading

- Make sure variable names start with `EXPO_PUBLIC_` prefix
- For EAS builds, use secrets (not `.env` files)
- For local development, use `.env` files

## Production Deployment

For production builds, the same secrets will be used. Just run:

```bash
eas build -p android --profile production
```

The secrets you set will automatically be included in the production build.

