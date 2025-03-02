// Script to test email functionality and diagnose issues
require('dotenv').config();
const nodemailer = require('nodemailer');
const { randomUUID } = require('crypto');

// Configuration from environment
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM;
const TEST_EMAIL = process.argv[2] || process.env.ADMIN_EMAILS?.split(',')[0] || 'contact@onnrides.com';

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
  console.log('       EMAIL FUNCTIONALITY TEST SCRIPT       ');
  console.log('============================================\n');

  // Step 1: Check environment variables
  step('1. Checking environment variables');
  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  const missingVars = requiredVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    error(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }
  
  success('All required environment variables are present');
  info(`SMTP Configuration:
  - Host: ${SMTP_HOST}
  - Port: ${SMTP_PORT}
  - User: ${SMTP_USER}
  - From: ${SMTP_FROM}
  - Testing with recipient: ${TEST_EMAIL}
  `);

  // Step 2: Create transporter
  step('2. Creating nodemailer transporter');
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: true, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: true
    },
    debug: true, // Show debug output
    logger: true // Log information about the mail
  });

  // Step 3: Verify connection
  step('3. Verifying SMTP connection');
  try {
    await transporter.verify();
    success('SMTP connection verified successfully');
  } catch (err) {
    error(`SMTP connection verification failed: ${err.message}`);
    if (err.code === 'EAUTH') {
      warning('Authentication error detected. Check your SMTP username and password.');
      warning('For Gmail accounts, use an app password instead of your regular password.');
      warning('Instructions: https://support.google.com/accounts/answer/185833');
    }
    process.exit(1);
  }

  // Step 4: Send a test email
  step('4. Sending test email');
  const testId = randomUUID().substring(0, 8);
  const mailOptions = {
    from: SMTP_FROM,
    to: TEST_EMAIL,
    subject: `Test Email ${testId} - ${new Date().toISOString()}`,
    html: `
      <h1>Email Test</h1>
      <p>This is a test email to verify email functionality.</p>
      <ul>
        <li><strong>Test ID:</strong> ${testId}</li>
        <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
        <li><strong>SMTP Host:</strong> ${SMTP_HOST}</li>
        <li><strong>SMTP User:</strong> ${SMTP_USER}</li>
      </ul>
      <p>If you received this email, the email functionality is working correctly.</p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    success(`Email sent successfully!`);
    info(`Message ID: ${info.messageId}`);
    info(`Accepted recipients: ${info.accepted.join(', ')}`);
    
    if (info.rejected && info.rejected.length > 0) {
      warning(`Rejected recipients: ${info.rejected.join(', ')}`);
    }
  } catch (err) {
    error(`Failed to send email: ${err.message}`);
    error(`Error details: ${JSON.stringify(err, null, 2)}`);
    process.exit(1);
  }

  console.log('\n============================================');
  success('EMAIL TEST COMPLETED SUCCESSFULLY');
  console.log('============================================\n');
}

// Run the test
main().catch(err => {
  error(`Unexpected error: ${err.message}`);
  error(err.stack);
  process.exit(1);
}); 