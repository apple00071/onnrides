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

## Enabling/Disabling Maintenance Mode

### Via Admin Panel

1. Log in as an administrator
2. Navigate to **Admin → Settings**
3. Toggle the "Maintenance Mode" switch to enable or disable maintenance mode

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
4. Make sure the `NEXT_PUBLIC_APP_URL` environment variable is set correctly.
5. Verify that the middleware is correctly deployed in production.

## Testing Maintenance Mode

You can test maintenance mode without affecting users by:

1. Setting up a test environment
2. Enabling maintenance mode
3. Verifying non-admin users are redirected
4. Verifying admin users can still access the site

The preview button on the Settings page also allows you to see how the maintenance page looks without enabling maintenance mode globally. 