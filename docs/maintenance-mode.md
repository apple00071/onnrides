# Maintenance Mode

This document explains how the maintenance mode feature works in the OnnRides application and how to properly configure it for both development and production environments.

## Overview

Maintenance mode allows administrators to temporarily disable public access to the site while maintenance or updates are being performed. When enabled, all non-admin users are redirected to a maintenance page.

## How It Works

1. The application uses Next.js middleware (`middleware.ts`) to check if maintenance mode is enabled.
2. The middleware calls the `/api/maintenance/check` API endpoint to check the current status.
3. The status is stored in the `settings` table in the database with the key `maintenance_mode`.
4. If enabled, non-admin users are redirected to the `/maintenance` page.
5. Admin users can still access the site even when maintenance mode is enabled.

## URL Consistency

For consistency in the site navigation and maintenance mode protection:

- The `/home` route redirects to the root URL (`/`) to prevent duplicate home pages
- All middleware checks apply to both the root URL and any other routes in the site
- This prevents confusion and ensures that maintenance mode applies uniformly across the site

## Managing Maintenance Mode

### Via Admin Panel

1. Log in as an administrator
2. Navigate to **Admin → Settings**
3. Toggle the "Maintenance Mode" switch to enable or disable maintenance mode

### Via Command Line

We've added npm scripts to manage maintenance mode from the command line:

```bash
# Check current status
npm run maintenance:status

# Enable maintenance mode
npm run maintenance:on

# Disable maintenance mode
npm run maintenance:off
```

### Via Database

You can also directly update the database setting:

```sql
-- Enable maintenance mode
UPDATE settings 
SET value = 'true', updated_at = CURRENT_TIMESTAMP 
WHERE key = 'maintenance_mode';

-- Disable maintenance mode
UPDATE settings 
SET value = 'false', updated_at = CURRENT_TIMESTAMP 
WHERE key = 'maintenance_mode';
```

## Important Constraints

1. **Edge Runtime Limitations**: Next.js middleware runs in the Edge Runtime environment, which has limitations:
   - Cannot use Node.js modules like direct database drivers
   - Cannot use the filesystem
   - Limited set of APIs available

2. **Caching**: The maintenance mode status is cached for 10 seconds in the middleware to reduce database load

## Configuration for Production

To ensure maintenance mode works correctly in production:

1. Make sure the `middleware.ts` file is properly deployed.
2. Update the `.env` file with the correct production URL:
   ```
   # For development
   # NEXT_PUBLIC_APP_URL="http://localhost:3000"
   
   # For production
   NEXT_PUBLIC_APP_URL="https://www.onnrides.com"
   ```

## Troubleshooting

If maintenance mode is not working correctly:

1. Check the server logs for any middleware errors.
2. Verify the `settings` table has a record with key `maintenance_mode`.
3. Test the API endpoint directly: `/api/maintenance/check`
4. Check if middleware is being applied by looking for the `X-Maintenance-Redirect` header in redirected responses
5. Try restarting the server if the middleware doesn't reflect recent changes

### Disabling Middleware

If middleware is causing issues, you can temporarily disable it by:

1. Rename `middleware.ts` to `middleware.backup.ts`
2. Rename `middleware.disabled.ts` to `middleware.ts`
3. Restart the server

## Maintenance Page Customization

The maintenance page is located at `app/maintenance/page.tsx` and can be customized with:

1. Your logo, branding colors, and messaging
2. Contact information for urgent requests
3. Social media links
4. Expected maintenance duration

The preview button on the Settings page also allows you to see how the maintenance page looks without enabling maintenance mode globally. 