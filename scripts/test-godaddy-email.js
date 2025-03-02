require('dotenv').config();
const nodemailer = require('nodemailer');
const chalk = require('chalk');

// Colors for better output readability
const colors = {
  blue: chalk.blue,
  green: chalk.green,
  red: chalk.red,
  yellow: chalk.yellow,
  magenta: chalk.magenta,
  cyan: chalk.cyan,
  bold: chalk.bold,
  underline: chalk.underline,
};

function log(color, prefix, message) {
  const timestamp = new Date().toISOString();
  console.log(`${color(`[${timestamp}] [${prefix}]`)} ${message}`);
}

const info = (message) => log(colors.blue, 'INFO', message);
const success = (message) => log(colors.green, 'SUCCESS', message);
const error = (message) => log(colors.red, 'ERROR', message);
const warning = (message) => log(colors.yellow, 'WARNING', message);
const step = (message) => log(colors.magenta, 'STEP', message);

async function main() {
  console.log('\n============================================');
  console.log('       GODADDY EMAIL CONNECTION TEST        ');
  console.log('============================================\n');

  // 1. Check environment variables
  step('1. Checking environment variables');
  
  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    error(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }
  
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT, 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM;
  
  if (smtpHost !== 'smtpout.secureserver.net') {
    warning(`SMTP_HOST is not set to GoDaddy's SMTP server (smtpout.secureserver.net)`);
  }
  
  if (!smtpUser.includes('@')) {
    error(`SMTP_USER should be a full email address, but got: ${smtpUser}`);
    process.exit(1);
  }
  
  success('All required environment variables are present');
  info(`SMTP Configuration:
  - Host: ${smtpHost}
  - Port: ${smtpPort}
  - User: ${smtpUser}
  - From: ${smtpFrom}
  - Testing with recipient: ${smtpUser}
  `);
  
  // 2. Create transporter
  step('2. Creating nodemailer transporter');
  
  // Create the transporter with the GoDaddy settings
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    debug: true, // Include debug output
    logger: true // Include logger
  });
  
  // 3. Verify connection
  step('3. Verifying SMTP connection');
  
  try {
    const verifyResult = await transporter.verify();
    success('SMTP connection verified successfully');
  } catch (verifyError) {
    error(`Failed to verify SMTP connection: ${verifyError.message}`);
    
    if (verifyError.message.includes('Invalid login')) {
      warning('Authentication failed - check your username and password');
      warning('For GoDaddy, make sure to use your full email address as the username');
    } else if (verifyError.message.includes('certificate')) {
      warning('SSL/TLS issue - you may need to adjust the port or secure settings');
      info('Try using port 587 with secure: false or port 465 with secure: true');
    }
    
    process.exit(1);
  }
  
  // 4. Send test email
  step('4. Sending test email');
  
  const testId = Math.random().toString(36).substring(2, 10);
  const timestamp = new Date().toISOString();
  
  try {
    // Send to yourself to avoid spamming others during testing
    const mailResult = await transporter.sendMail({
      from: smtpFrom,
      to: smtpUser, // Send to yourself for testing
      subject: `GoDaddy Email Test ${testId} - ${timestamp}`,
      html: `
      <h1>GoDaddy Email Test</h1>
      <p>This is a test email to verify GoDaddy email configuration.</p>
      <ul>
        <li><strong>Test ID:</strong> ${testId}</li>
        <li><strong>Timestamp:</strong> ${timestamp}</li>
        <li><strong>SMTP Host:</strong> ${smtpHost}</li>
        <li><strong>SMTP User:</strong> ${smtpUser}</li>
      </ul>
      <p>If you received this email, the GoDaddy email configuration is working correctly.</p>
      `
    });
    
    success(`Email sent successfully! MessageID: ${mailResult.messageId}`);
    
    // Preview URL is only available for ethereal emails, not for real SMTP servers
    // so we'll skip that line.
    
    info('Check your inbox for the test email');
    
    // Additional information
    if (mailResult.accepted && mailResult.accepted.length > 0) {
      success(`Accepted recipients: ${mailResult.accepted.join(', ')}`);
    }
    
    if (mailResult.rejected && mailResult.rejected.length > 0) {
      warning(`Rejected recipients: ${mailResult.rejected.join(', ')}`);
    }
    
  } catch (sendError) {
    error(`Failed to send email: ${sendError.message}`);
    console.error('Error details:', sendError);
    process.exit(1);
  }
  
  console.log('\n============================================');
  success('TEST COMPLETED SUCCESSFULLY');
  console.log('============================================\n');
}

// Run the test
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 