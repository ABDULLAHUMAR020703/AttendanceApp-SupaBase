# Splash Screen Logo Update Fix

## Issue
The Expo app loading page (splash screen) is still showing the old logo even though `splash.png` has been updated.

## Root Cause
Expo caches splash screen assets, and native Android splash screen assets in `android/app/src/main/res/drawable-*/` folders may still contain the old logo.

## Solution

### Step 1: Verify splash.png is Updated
```bash
cd apps/mobile/assets
# Verify splash.png matches logo.png
```

### Step 2: Clear Native Splash Screen Assets
Delete the old native splash screen assets:
```bash
cd apps/mobile
# Remove old splash screen logos from all density folders
Remove-Item -Path "android\app\src\main\res\drawable-*\splashscreen_logo.png" -Force
```

### Step 3: Clear Expo Cache
```bash
cd apps/mobile
npx expo start --clear
```

### Step 4: Regenerate Native Assets (if needed)
If the splash screen still doesn't update, regenerate native assets:
```bash
cd apps/mobile
npx expo prebuild --clean
```

This will regenerate:
- Android splash screen logos in all density folders
- iOS splash screen assets
- All native icon assets

### Step 5: Restart Development Server
```bash
cd apps/mobile
# Stop current server (Ctrl+C)
npx expo start --clear
```

## Alternative: Manual Regeneration

If `expo prebuild` doesn't work, you can manually copy splash.png to native assets:

1. **For Android:** The splash screen logos are auto-generated during build from `assets/splash.png`
2. **For iOS:** The splash screen is auto-generated during build from `assets/splash.png`

## Verification

After clearing cache and restarting:
1. Close the app completely
2. Reopen the app
3. The splash screen should show the new logo from `splash.png`

## Notes

- Expo caches splash screens aggressively
- Native assets in `android/app/src/main/res/` are generated during build
- The `--clear` flag clears Metro bundler cache but may not clear native asset cache
- For production builds, native assets are regenerated automatically from `splash.png`
