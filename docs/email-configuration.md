# Email Configuration Guide

This document provides information about the email configuration for the OnnRides application.

## GoDaddy Email Configuration

The application is configured to use GoDaddy's email service for sending emails. Here are the key configuration details:

### SMTP Settings

The following settings are used for connecting to GoDaddy's SMTP server:

- **Host**: `smtpout.secureserver.net`
- **Port**: `465` (with SSL) or `587` (with TLS)
- **Username**: Your full email address (e.g., `contact@onnrides.com`)
- **Password**: Your GoDaddy email password
- **From**: `ONNRIDES <contact@onnrides.com>`

### Environment Variables

These settings are configured in the `.env` file:

```
SMTP_HOST="smtpout.secureserver.net"
SMTP_PORT=465
SMTP_USER="contact@onnrides.com"
SMTP_PASS="your-godaddy-password"
SMTP_FROM="ONNRIDES <contact@onnrides.com>"
```

## Testing the Email Configuration

You can test the email configuration using the provided test scripts:

### Basic Test

```
node scripts/test-godaddy-email.js
```

This script will:
1. Check your environment variables
2. Test the SMTP connection
3. Send a test email
4. Report success or failure with detailed error messages

### Comprehensive Diagnostics

```
node scripts/diagnose-emails.js
```

This script performs a more comprehensive diagnostic of the entire email system.

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Make sure your username is your full email address (e.g., `contact@onnrides.com`)
   - Check if your password is correct
   - Ensure your GoDaddy account has email services enabled

2. **Connection Issues**
   - Try both port 465 (SSL) and 587 (TLS)
   - Adjust the `secure` setting accordingly (true for 465, false for 587)

3. **Rate Limiting**
   - GoDaddy may have sending limits on your account tier
   - Consider implementing email queuing for high-volume scenarios

### DNS Configuration for Deliverability

For optimal email deliverability, ensure your GoDaddy domain has proper SPF and DKIM records:

1. **SPF Record**: 
   ```
   v=spf1 include:secureserver.net -all
   ```

2. **DKIM**: 
   - Configure through GoDaddy's Email & Office management interface

## Support

For issues with GoDaddy email services, contact GoDaddy support directly:
- GoDaddy Support: https://www.godaddy.com/help

For application-specific email issues, refer to:
- Check the email logs in the database
- Run the diagnostic scripts mentioned above 