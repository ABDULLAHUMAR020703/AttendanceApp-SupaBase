# Deployment Guide

## Overview

This guide covers deployment procedures for the Attendance App using the modular architecture.

## Pre-Deployment Checklist

- [ ] All environment variables are configured
- [ ] Firebase configuration is set up
- [ ] API keys are secured (not in code)
- [ ] Build scripts are tested locally
- [ ] Dependencies are up to date
- [ ] Code is linted and formatted
- [ ] Tests pass (if applicable)

## Environment Setup

### Required Environment Variables

Create a `.env` file (not committed to git):

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Build Commands

### Development Build

```bash
npm start
```

### Production Build - Android

```bash
npm run android:build
# or
eas build --platform android --profile production
```

### Production Build - iOS

```bash
npm run ios:build
# or
eas build --platform ios --profile production
```

## Deployment Steps

### 1. Update Version

Update version in:
- `package.json`
- `app.json` (version and buildNumber)

### 2. Build for Production

```bash
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

### 3. Submit to Stores

```bash
# Android (Google Play)
eas submit --platform android

# iOS (App Store)
eas submit --platform ios
```

## CI/CD Pipeline

The project includes GitHub Actions workflow (`.github/workflows/deploy.yml`) that:

1. Runs on push to `master`/`main`
2. Installs dependencies
3. Runs linter
4. Builds Android and iOS (if configured)

## Modular Architecture Benefits for Deployment

1. **Isolated Features**: Each feature can be tested independently
2. **Clear Dependencies**: Easy to identify what needs to be deployed
3. **Scalable**: Add new features without affecting existing ones
4. **Maintainable**: Clear structure makes debugging easier

## Troubleshooting

### Build Fails

1. Check environment variables
2. Verify Firebase configuration
3. Check dependency versions
4. Review build logs

### Import Errors

1. Verify all imports use correct paths
2. Check feature exports in `index.js` files
3. Ensure shared modules are accessible

## Rollback Procedure

1. Revert to previous git commit
2. Rebuild and redeploy
3. Monitor for issues

