#!/usr/bin/env node

/**
 * Simple CLI tool to test admin email delivery
 * Usage: node test-admin-email.js [email]
 * If no email is provided, it will use ADMIN_EMAILS from the environment
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const nodemailer = require('nodemailer');
const { program } = require('commander');

program
  .name('test-admin-email')
  .description('Test admin email delivery directly using SMTP')
  .version('1.0.0')
  .argument('[email]', 'Email to send test to (optional, defaults to ADMIN_EMAILS)')
  .option('-d, --debug', 'Enable debug mode')
  .parse(process.argv);

const email = program.args[0];
const debug = program.opts().debug;

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  grey: '\x1b[90m'
};

// Log function with colors
function log(color, prefix, message) {
  console.log(`${color}[${prefix}]${colors.reset} ${message}`);
}

// Logger
const logger = {
  info: (message) => log(colors.blue, 'INFO', message),
  success: (message) => log(colors.green, 'SUCCESS', message),
  warn: (message) => log(colors.yellow, 'WARNING', message),
  error: (message) => log(colors.red, 'ERROR', message),
  debug: (message) => debug && log(colors.grey, 'DEBUG', message)
};

// Main function
async function main() {
  try {
    logger.info('Starting admin email test');
    
    // Check required environment variables
    const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
    const missingVars = [];
    
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }
    
    if (missingVars.length > 0) {
      logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
      logger.info('Please set these variables in your .env file or environment');
      process.exit(1);
    }
    
    // Get admin emails
    const adminEmails = email ? [email] : (process.env.ADMIN_EMAILS || '').split(',');
    
    if (!adminEmails.length || (adminEmails.length === 1 && !adminEmails[0])) {
      logger.error('No admin email addresses found');
      logger.info('Please provide an email address as an argument or set ADMIN_EMAILS in your .env file');
      process.exit(1);
    }
    
    // Log configuration
    logger.info(`SMTP Host: ${process.env.SMTP_HOST}`);
    logger.info(`SMTP Port: ${process.env.SMTP_PORT}`);
    logger.info(`SMTP User: ${process.env.SMTP_USER}`);
    logger.info(`SMTP From: ${process.env.SMTP_FROM}`);
    logger.info(`Target email(s): ${adminEmails.join(', ')}`);
    
    // Create transport
    logger.info('Creating SMTP transport...');
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    // Verify connection
    logger.info('Verifying SMTP connection...');
    await transport.verify();
    logger.success('SMTP connection verified successfully');
    
    // Create timestamp
    const timestamp = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    // Test ID
    const testId = `TEST-${Date.now().toString(36).toUpperCase()}`;
    
    // Send email to each admin
    for (const adminEmail of adminEmails) {
      if (!adminEmail || !adminEmail.trim()) continue;
      
      logger.info(`Sending test email to ${adminEmail.trim()}...`);
      
      // Create email content
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 5px;">
          <h1 style="color: #f26e24;">OnnRides Admin Email Test</h1>
          <p>This is a test email sent directly from the command line.</p>
          
          <div style="background-color: #f8f8f8; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p><strong>Delivery Information:</strong></p>
            <ul>
              <li>Test ID: ${testId}</li>
              <li>Sent at: ${timestamp}</li>
              <li>Recipient: ${adminEmail.trim()}</li>
              <li>SMTP Host: ${process.env.SMTP_HOST}</li>
              <li>SMTP Port: ${process.env.SMTP_PORT}</li>
              <li>Using CLI test script</li>
            </ul>
          </div>
          
          <p>If you received this email, admin notifications should be working properly! 🎉</p>
          <p>Please check the following:</p>
          <ul>
            <li>Is this email in your inbox? If it's in spam, add the sender to your contacts.</li>
            <li>How long did it take to arrive? The send time was ${timestamp}.</li>
            <li>Are all formatting and images displayed correctly?</li>
          </ul>
          
          <p style="color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
            This is an automated test from OnnRides CLI tool. Please do not reply to this email.
          </p>
        </div>
      `;
      
      // Send email
      const result = await transport.sendMail({
        from: process.env.SMTP_FROM,
        to: adminEmail.trim(),
        subject: `OnnRides Admin Email Test [${testId}]`,
        html: emailContent
      });
      
      logger.success(`Email sent successfully to ${adminEmail.trim()}`);
      logger.debug(`Message ID: ${result.messageId}`);
      logger.debug(`Response: ${JSON.stringify(result.response)}`);
    }
    
    logger.success('All test emails sent successfully!');
    logger.info('Please check your email inbox (and spam folder) to ensure delivery');
    logger.info(`Look for an email with subject "OnnRides Admin Email Test [${testId}]"`);
  } catch (error) {
    logger.error(`Failed to send test email: ${error.message}`);
    if (error.code) {
      logger.error(`Error code: ${error.code}`);
    }
    if (debug) {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run the main function
main(); 