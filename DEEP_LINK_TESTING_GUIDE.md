# Deep Linking Testing Guide

## ⚠️ IMPORTANT: Expo Go Does NOT Support Custom Schemes

**Custom URL schemes like `hadirai://` require a native build. Expo Go cannot test this feature.**

---

## Option 1: Expo Dev Client (Recommended for Testing)

**Best for:** Quick testing during development  
**Time:** ~10-15 minutes for first build  
**Cost:** Free

### Setup Steps:

1. **Install expo-dev-client:**
   ```bash
   cd apps/mobile
   npx expo install expo-dev-client
   ```

2. **Build Dev Client for Android:**
   ```bash
   # Option A: Local build (requires Android Studio)
   npx expo run:android
   
   # Option B: EAS Build (cloud build, easier)
   eas build --profile development --platform android
   ```

3. **Install the Dev Client APK:**
   - If using `expo run:android`: It installs automatically
   - If using EAS Build: Download APK from EAS dashboard and install on device

4. **Start Development Server:**
   ```bash
   npx expo start --dev-client
   ```

5. **Test Deep Linking:**
   ```bash
   # Test from command line
   npx uri-scheme open hadirai://reset-password --android
   
   # Or click email link - should open app
   ```

**Advantages:**
- ✅ Supports custom schemes
- ✅ Hot reload still works
- ✅ Faster than full APK builds
- ✅ Can test on physical device

---

## Option 2: Full Production APK Build

**Best for:** Final testing before release  
**Time:** ~20-30 minutes  
**Cost:** Free (EAS free tier)

### Setup Steps:

1. **Configure EAS Build (if not done):**
   ```bash
   cd apps/mobile
   eas build:configure
   ```

2. **Build Production APK:**
   ```bash
   eas build --platform android --profile production
   ```

3. **Download and Install APK:**
   - Download from EAS dashboard
   - Install on Android device
   - Enable "Install from Unknown Sources" if needed

4. **Test Deep Linking:**
   - Request password reset from app
   - Click email link
   - App should open to ResetPasswordScreen

**Advantages:**
- ✅ Production-ready build
- ✅ Tests exact user experience
- ✅ Can share with testers

---

## Option 3: Local Android Build (Advanced)

**Best for:** Developers with Android Studio setup  
**Time:** ~5-10 minutes after initial setup

### Setup Steps:

1. **Ensure Android Studio is installed:**
   - Android SDK
   - Android Emulator or connected device

2. **Build and Run:**
   ```bash
   cd apps/mobile
   npx expo run:android
   ```

3. **Test Deep Linking:**
   ```bash
   # On emulator/device
   adb shell am start -W -a android.intent.action.VIEW -d "hadirai://reset-password"
   ```

---

## Quick Test Without Building

**You can verify the configuration is correct without building:**

### 1. Check app.json Configuration:
```bash
cd apps/mobile
cat app.json | grep -A 10 "intentFilters"
```

Should show:
```json
"intentFilters": [
  {
    "action": "VIEW",
    "autoVerify": true,
    "data": [{"scheme": "hadirai"}],
    "category": ["BROWSABLE", "DEFAULT"]
  }
]
```

### 2. Check Linking Configuration:
```bash
cat core/navigation/AppNavigator.js | grep -A 10 "linking ="
```

Should show:
```javascript
const linking = {
  prefixes: ['hadirai://'],
  config: {
    screens: {
      Auth: {
        screens: {
          ResetPassword: 'reset-password',
          ...
        }
      }
    }
  }
};
```

### 3. Verify Supabase Configuration:
- Go to Supabase Dashboard
- Authentication → URL Configuration
- Check `hadirai://reset-password` is in Redirect URLs

---

## Testing Checklist

After building (Dev Client or APK):

- [ ] App installs successfully
- [ ] App opens normally
- [ ] Command line test: `npx uri-scheme open hadirai://reset-password --android` opens app
- [ ] App navigates to ResetPasswordScreen
- [ ] Request password reset from ForgotPasswordScreen
- [ ] Click email link → App opens
- [ ] ResetPasswordScreen shows (not "Invalid Reset Link")
- [ ] Can successfully reset password

---

## Troubleshooting

### Deep link doesn't open app:
- ✅ Verify app was rebuilt after `app.json` changes
- ✅ Check intent filters are in `app.json`
- ✅ Try uninstalling and reinstalling app

### App opens but wrong screen:
- ✅ Check linking config in `AppNavigator.js`
- ✅ Verify route names match (`ResetPassword` vs `reset-password`)

### "Invalid Reset Link" error:
- ✅ Check Supabase redirect URL is configured
- ✅ Verify email link contains `hadirai://reset-password`
- ✅ Check network connection

---

## Recommendation

**For quick testing:** Use **Expo Dev Client** (Option 1)
- One-time build setup
- Then you can test deep linking immediately
- Hot reload still works for other features

**For production verification:** Use **Full APK Build** (Option 2)
- Tests exact production experience
- Can share with testers

**Do NOT use:** Expo Go (won't work for custom schemes)
