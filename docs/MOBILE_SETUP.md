# Mobile Setup Guide

This guide explains how to set up and run DailyGoalMap on mobile devices (Android and iOS) using Capacitor.

## Prerequisites

- Node.js and npm installed
- For iOS: macOS with Xcode installed
- For Android: Android Studio installed

## Initial Setup

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd dailygoalmap
npm install
```

### 2. Initialize Capacitor

The project already has Capacitor configured, but if you need to reinitialize:

```bash
npx cap init
```

Use these values:
- **App ID**: `app.lovable.bc33f2b2b2664c9bb48e608d746fd0cd`
- **App Name**: `dailygoalmap`

### 3. Build the Web App

```bash
npm run build
```

### 4. Add Platforms

For Android:
```bash
npx cap add android
```

For iOS:
```bash
npx cap add ios
```

### 5. Sync the Project

After building, sync the web assets with the native platforms:

```bash
npx cap sync
```

## Running on Mobile

### Android

1. Open Android Studio:
```bash
npx cap open android
```

2. In Android Studio:
   - Wait for Gradle sync to complete
   - Select your device/emulator from the toolbar
   - Click the "Run" button (green play icon)

Or run directly from command line:
```bash
npx cap run android
```

### iOS

1. Open Xcode:
```bash
npx cap open ios
```

2. In Xcode:
   - Select your device/simulator from the toolbar
   - Click the "Run" button (play icon)
   - You may need to set up code signing in the "Signing & Capabilities" tab

Or run directly from command line:
```bash
npx cap run ios
```

## Mobile Features

### Native Reminders

The app includes native reminder functionality that allows users to add tasks to their device's reminder system.

**Features:**
- Add task reminders directly to device calendar/reminders
- Set reminders with specific dates and times
- Automatic notification permissions handling
- Works on both Android and iOS

**Usage:**
1. Open a task detail view on mobile
2. Click the "Add to Device Reminders" button
3. Grant notification permissions if prompted
4. The reminder will be added to your device

### Push Notifications

The app supports push notifications for:
- Task updates from team members
- Goal invitations
- Task completions
- Member activities

**Setup:**
Push notifications are configured using the tinynotie API and work automatically once the user enables them in the app settings.

## Development Workflow

### Hot Reload (Development)

During development, you can use hot reload by connecting to the development server:

1. Make sure your mobile device/emulator is on the same network as your development machine
2. The app is configured to connect to: `https://bc33f2b2-b266-4c9b-b48e-608d746fd0cd.lovableproject.com`

### After Code Changes

Whenever you make changes to the web code:

```bash
npm run build
npx cap sync
```

Then rerun the app on your device.

### After Plugin Changes

If you add or modify Capacitor plugins:

```bash
npm install
npx cap sync
npx cap update ios    # For iOS
npx cap update android # For Android
```

## Troubleshooting

### Android Issues

**Gradle Build Fails:**
- Update Android Studio and Gradle
- Clear Gradle cache: `cd android && ./gradlew clean`

**App Won't Install:**
- Check that USB debugging is enabled on your device
- Try uninstalling the old version first

### iOS Issues

**Code Signing Error:**
- Open Xcode and configure signing in "Signing & Capabilities"
- Use your Apple Developer account or create a free provisioning profile

**Simulator Not Starting:**
- Reset simulator: `xcrun simctl erase all`
- Restart Xcode

### Permission Issues

**Notifications Not Working:**
1. Check that notification permissions are granted in device settings
2. Verify that the app has requested permissions
3. Check console logs for permission errors

## Building for Production

### Android

1. Build the release APK:
```bash
cd android
./gradlew assembleRelease
```

2. The APK will be in: `android/app/build/outputs/apk/release/`

For Google Play Store, you'll need to create a signed bundle:
```bash
./gradlew bundleRelease
```

### iOS

1. Open Xcode
2. Select "Any iOS Device" as the build target
3. Go to Product > Archive
4. Follow the wizard to submit to App Store Connect

## Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Capacitor Local Notifications Plugin](https://capacitorjs.com/docs/apis/local-notifications)
- [Android Studio Setup](https://developer.android.com/studio)
- [Xcode Setup](https://developer.apple.com/xcode/)

## Support

For more information about mobile development with this project, see:
- [Lovable Mobile Development Blog Post](https://lovable.dev/blogs/TODO)
