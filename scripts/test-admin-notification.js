// Script to test admin notification functionality
require('dotenv').config();
const { randomUUID } = require('crypto');
const path = require('path');
const fs = require('fs');

// Colored console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(color, prefix, message) {
  const timestamp = new Date().toISOString();
  console.log(`${color}[${timestamp}] [${prefix}]${colors.reset} ${message}`);
}

// Loggers
const info = (message) => log(colors.blue, 'INFO', message);
const success = (message) => log(colors.green, 'SUCCESS', message);
const error = (message) => log(colors.red, 'ERROR', message);
const warning = (message) => log(colors.yellow, 'WARNING', message);
const step = (message) => log(colors.magenta, 'STEP', message);

async function main() {
  console.log('\n============================================');
  console.log('    ADMIN NOTIFICATION FUNCTIONALITY TEST    ');
  console.log('============================================\n');

  // Step 1: Check environment variables
  step('1. Checking environment variables');
  const requiredEmailVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  const missingEmailVars = requiredEmailVars.filter(v => !process.env[v]);
  
  if (missingEmailVars.length > 0) {
    warning(`Missing email environment variables: ${missingEmailVars.join(', ')}`);
  } else {
    success('All required email environment variables are present');
  }

  // Check admin emails
  const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];
  if (adminEmails.length === 0) {
    warning('No admin emails configured in ADMIN_EMAILS');
  } else {
    info(`Admin emails configured: ${adminEmails.join(', ')}`);
  }

  // WhatsApp configuration
  const whatsappVars = ['ULTRAMSG_TOKEN', 'ULTRAMSG_INSTANCE_ID'];
  const missingWhatsappVars = whatsappVars.filter(v => !process.env[v]);
  
  if (missingWhatsappVars.length > 0) {
    warning(`Missing WhatsApp environment variables: ${missingWhatsappVars.join(', ')}`);
  } else {
    info(`WhatsApp configuration present`);
  }

  // Step 2: Check admin notification service
  step('2. Checking admin notification implementation');
  const adminNotificationPath = path.join(process.cwd(), 'lib', 'notifications', 'admin-notification.ts');
  
  if (fs.existsSync(adminNotificationPath)) {
    success(`Admin notification service found at ${adminNotificationPath}`);
    
    // Read the file and check implementation
    const content = fs.readFileSync(adminNotificationPath, 'utf8');
    
    const hasGetAdminEmails = content.includes('getAdminEmails');
    const usesProcEnv = content.includes('process.env.ADMIN_EMAILS');
    const hasFallback = content.includes('DEFAULT_ADMIN_EMAILS');
    
    if (hasGetAdminEmails) {
      success('Admin notification service has getAdminEmails method');
    } else {
      warning('Admin notification service is missing getAdminEmails method');
    }
    
    if (usesProcEnv) {
      success('Admin notification service uses process.env.ADMIN_EMAILS');
    } else {
      warning('Admin notification service may not be using environment variables correctly');
    }
    
    if (hasFallback) {
      info('Admin notification service has fallback admin emails');
    }
  } else {
    error(`Admin notification service not found at ${adminNotificationPath}`);
  }

  // Step 3: Make a HTTP request to test API
  step('3. Testing admin notification API');
  
  info('To test the admin notification API, you would need to run:');
  info('curl -X GET http://localhost:3000/api/admin/check-emails');
  info('or visit: http://localhost:3000/api/admin/check-emails in your browser');
  
  // Step 4: Check for common issues
  step('4. Checking for common issues');
  
  // GMT vs IST timezone issues
  const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  info(`Current system timezone: ${currentTimezone}`);
  if (currentTimezone !== 'Asia/Kolkata') {
    warning('System timezone is not set to Asia/Kolkata (IST), which might affect timestamps');
  }
  
  // Gmail security issues
  if (process.env.SMTP_HOST?.includes('gmail')) {
    info('Using Gmail SMTP server');
    warning('Gmail may require "Less secure app access" to be enabled or an app password');
    warning('App passwords: https://support.google.com/accounts/answer/185833');
    warning('Less secure access (not recommended): https://myaccount.google.com/lesssecureapps');
  }
  
  // Rate limits
  warning('Email providers often have rate limits (Gmail: 500/day, 20/hour for free accounts)');
  
  console.log('\n============================================');
  success('ADMIN NOTIFICATION TEST COMPLETED');
  console.log('============================================\n');
}

// Run the test
main().catch(err => {
  error(`Unexpected error: ${err.message}`);
  error(err.stack);
  process.exit(1);
}); 