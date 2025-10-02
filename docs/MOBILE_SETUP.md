# Mobile & PWA Setup Guide

This guide explains how to use the mobile and PWA features of Daily Goal Map.

## Overview

Daily Goal Map is built as a Progressive Web App (PWA) that works seamlessly on desktop and mobile browsers. No app store downloads required!

## PWA Features

### Installation

**iOS (iPhone/iPad):**
1. Open Safari and navigate to your app URL
2. Tap the Share button (square with arrow pointing up)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" to confirm

**Android:**
1. Open Chrome and navigate to your app URL
2. Tap the three-dot menu in the top right
3. Tap "Add to Home Screen" or "Install App"
4. Tap "Add" or "Install" to confirm

**Desktop:**
- Look for the install icon in your browser's address bar
- Click it to install the PWA as a desktop app

### Offline Support
- The app works offline after initial load
- Your data syncs automatically when connection is restored

## Task Reminders

### How It Works

When you click "Download Reminder" on any task, the app creates an `.ics` calendar file that you can import into your device's calendar or reminder app.

**iOS:**
1. Click "Download Reminder" on a task
2. Safari will download a `.ics` file
3. Tap the file to open it
4. Tap "Add to Calendar" or "Add to Reminders"
5. The task will appear in your chosen app with:
   - Title and description
   - Date and time
   - 15-minute advance reminder

**Android:**
1. Click "Download Reminder" on a task
2. Chrome will download a `.ics` file
3. Open the file from your Downloads
4. Choose your Calendar or Reminder app
5. The task will be imported automatically

**Desktop:**
1. Click "Download Reminder" on a task
2. Your browser downloads a `.ics` file
3. Double-click to open in Outlook, Apple Calendar, Google Calendar, etc.
4. The event will be imported with all details

### What's Included in Reminders

Each reminder contains:
- **Task title** as the event name
- **Task description** in the notes
- **Start date and time** from your task
- **1-hour duration** (you can adjust in your calendar app)
- **15-minute advance notification**

## Push Notifications

### Web Push Notifications

The app supports browser-based push notifications for:
- Task deadlines approaching
- Goal updates and completions
- Team collaboration updates

**Setup:**
1. Grant notification permissions when prompted
2. Notifications work even when the browser is closed (on supported browsers)

**Supported Browsers:**
- Chrome, Edge, Firefox on desktop
- Chrome, Samsung Internet on Android
- Safari on macOS (limited support)
- Safari on iOS (limited - iOS 16.4+)

## Why PWA Instead of Native App?

**Advantages:**
- ✅ No app store approval needed
- ✅ Instant updates without downloads
- ✅ Works on all devices with a browser
- ✅ No installation size limits
- ✅ Easier to maintain and update
- ✅ Direct access via URL
- ✅ Cross-platform by design

**What You Can Do:**
- Install on home screen like a native app
- Work offline
- Receive push notifications
- Export tasks to native calendar/reminder apps
- Full functionality without app store

## Troubleshooting

### Reminders Not Working
- **File not downloading:** Check browser download settings and permissions
- **Can't open .ics file:** Ensure you have a calendar app installed
- **iOS Safari:** Make sure you're not in Private Browsing mode

### PWA Not Installing
- Use a supported browser (Safari on iOS, Chrome on Android)
- Access via HTTPS (not HTTP)
- Clear browser cache and try again
- Ensure you're not in incognito/private mode

### Notifications Not Working
- Grant notification permissions in browser settings
- Check that notifications aren't blocked for the site
- On iOS: Update to iOS 16.4+ for best support
- Try reinstalling the PWA

### Offline Issues
- Ensure the app loaded fully at least once while online
- Check your service worker is active (check in browser dev tools)
- Clear cache and reload if data seems stale

## Additional Resources

- [PWA Best Practices](https://web.dev/progressive-web-apps/)
- [iCalendar (.ics) Format](https://icalendar.org/)
- [Web Push Notifications](https://web.dev/push-notifications-overview/)
- [Browser Support for PWAs](https://caniuse.com/?search=pwa)
