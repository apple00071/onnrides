# Admin PWA (Progressive Web App)

This document explains how to use the Admin PWA functionality in the OnnRides application.

## Overview

The OnnRides Admin Dashboard can be installed as a Progressive Web App (PWA) on desktop and mobile devices. This provides a more app-like experience with the following benefits:

- Quick access from your home screen/desktop
- Focused admin interface without browser controls
- Improved performance through caching
- Support for push notifications (when configured)
- Mobile-optimized interface on small screens

## Installation

### For Administrators

1. Navigate to any page in the OnnRides admin section (e.g., `/admin/dashboard`)
2. Look for the "Install Admin App" button in the bottom right corner
3. Click the button and follow the installation prompts
4. Once installed, the app will be available on your device's home screen or app drawer

### For Developers

The Admin PWA is configured through several key files:

- `/public/admin/manifest.json`: Defines app metadata, icons, and scope
- `/public/admin/sw.js`: Service worker for controlling the PWA behavior
- `/app/admin/components/AdminPWA.tsx`: React component for installation UI
- `/app/admin/layout.tsx`: Admin layout with service worker registration
- `/app/admin/components/MobileAdminWrapper.tsx`: Mobile-specific UI enhancements

## Mobile-Specific UI

On mobile devices, the Admin PWA provides an optimized user interface with:

1. **Bottom Navigation Bar**: Easy access to key sections with touch-friendly tabs
2. **Collapsible Header**: Header that hides when scrolling down to maximize screen space
3. **Optimized Layouts**: Content layouts designed for smaller screens
4. **iOS Home Bar Support**: Proper padding for devices with notches or home bars

This mobile interface is automatically applied when:
- The screen width is 768px or less
- The user agent indicates a mobile device
- The app is running in standalone mode (installed as PWA)

## Important Usage Notes

When using the Admin PWA, keep the following in mind:

1. **Stay Within Admin Section**: Always navigate within the `/admin/` paths. If you navigate to the main site (e.g., `/`, `/home`), you'll need to manually navigate back to `/admin/dashboard`.

2. **Offline Limitations**: The Admin PWA requires an internet connection to function. It does not support offline mode due to the dynamic nature of the admin dashboard.

3. **Installation Issues**: If you experience problems with installation, try:
   - Clearing your browser cache
   - Restarting your browser
   - Using Chrome or Edge for best PWA support

## Developer Configuration

### Icon Generation

The PWA icons are specially formatted for optimal display on home screens:

- **Maskable Icons**: Android adaptive icons with safe zones
- **iOS-Specific Icons**: Properly formatted for iOS home screens
- **Proper Padding**: Icons have appropriate padding for different platforms

### Service Worker Scope

The service worker is configured with a scope of `/admin/`, which means it only controls pages within the admin section of the site. This is intentional to prevent conflicts with the main site.

```js
navigator.serviceWorker.register('/admin/sw.js', { 
  scope: '/admin/'
})
```

### Manifest Configuration

The `manifest.json` file includes several important settings:

```json
{
  "start_url": "/admin/dashboard",
  "scope": "/admin/",
  "display": "standalone",
  "icons": [
    {
      "src": "/admin/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/admin/icon-192x192-maskable.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

These settings ensure the PWA launches directly to the admin dashboard, only controls admin pages, and uses properly formatted icons.

## Troubleshooting

### PWA Shows Main Site Instead of Admin

If your installed PWA is showing the main site instead of the admin dashboard:

1. **Manual Navigation**: Enter `/admin/dashboard` in the address bar
2. **Reinstall**: Uninstall the PWA and reinstall it from the admin dashboard
3. **Clear Cache**: Clear your browser's cache and service workers

### Home Screen Icon Issues

If icons appear incorrectly on the home screen:

1. **Regenerate Icons**: Run `npm run generate:admin-icons` to create properly formatted icons
2. **Clear PWA Cache**: Uninstall and reinstall the PWA after icon generation
3. **Platform-Specific**: Android and iOS have different icon requirements, check both platforms

### Cannot Install PWA

If you don't see the install button or installation fails:

1. **Check Browser**: Ensure you're using a modern browser that supports PWAs
2. **HTTPS Required**: PWAs require HTTPS in production
3. **Already Installed**: The PWA might already be installed on your device

## Generating Admin Icons

To regenerate the admin icons:

```bash
npm run generate:admin-icons
```

This will create all necessary icon files in the `/public/admin/` directory, including properly formatted maskable icons for Android and iOS. 