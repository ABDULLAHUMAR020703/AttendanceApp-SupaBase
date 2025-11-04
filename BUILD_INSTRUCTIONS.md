# Building APK for Attendance App

## Prerequisites
1. An Expo account (free) - Create at https://expo.dev
2. EAS CLI installed (will be installed automatically)

## Build Steps

### Option 1: EAS Build (Cloud Build - Recommended)
This is the easiest method and doesn't require Android Studio.

1. **Login to Expo** (if not already logged in):
   ```bash
   npx eas-cli login
   ```

2. **Build APK for Android**:
   ```bash
   npx eas-cli build --platform android --profile preview
   ```
   This will create an APK file that you can download and install on Android devices.

3. **Wait for build to complete** (usually 10-20 minutes)

4. **Download the APK**:
   - The build will provide a URL to download the APK
   - Or visit https://expo.dev to download from your project dashboard

### Option 2: Local Build (Requires Android Studio)
If you have Android Studio installed, you can build locally:

1. **Install Android Studio** and set up Android SDK
2. **Build locally**:
   ```bash
   npx expo run:android --variant release
   ```
   The APK will be in: `android/app/build/outputs/apk/release/app-release.apk`

## Notes
- The APK built with EAS Build will be a standalone app (not requiring Expo Go)
- First build may take longer (15-20 minutes)
- Subsequent builds are faster (5-10 minutes)
- The APK can be installed on any Android device

