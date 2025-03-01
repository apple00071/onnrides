#!/usr/bin/env node
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import os from 'os';
import nodemailer from 'nodemailer';

// Initialize environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

// Get script directory
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const LOG_PREFIX = '[EMAIL DIAGNOSTIC]';

/**
 * Simple color-coded logging helper
 */
const logger = {
  info: (message, ...args) => console.log(`\x1b[36m${LOG_PREFIX} INFO:\x1b[0m ${message}`, ...args),
  success: (message, ...args) => console.log(`\x1b[32m${LOG_PREFIX} SUCCESS:\x1b[0m ${message}`, ...args),
  warn: (message, ...args) => console.log(`\x1b[33m${LOG_PREFIX} WARNING:\x1b[0m ${message}`, ...args),
  error: (message, ...args) => console.log(`\x1b[31m${LOG_PREFIX} ERROR:\x1b[0m ${message}`, ...args),
  section: (title) => console.log(`\n\x1b[35m${LOG_PREFIX} ${title}\x1b[0m`)
};

/**
 * Check environment variables
 */
async function checkEnvironmentVariables() {
  logger.section('CHECKING ENVIRONMENT VARIABLES');

  const required = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'SMTP_FROM',
    'ADMIN_EMAILS'
  ];

  let missingCount = 0;
  
  for (const varName of required) {
    if (!process.env[varName]) {
      logger.error(`Missing environment variable: ${varName}`);
      missingCount++;
    } else {
      let value = process.env[varName];
      if (varName === 'SMTP_PASSWORD') {
        value = value.substring(0, 3) + '*'.repeat(value.length - 3);
      }
      logger.info(`${varName}: ${value}`);
    }
  }

  if (missingCount > 0) {
    logger.error(`Found ${missingCount} missing environment variables`);
    return false;
  }

  // Check admin emails format
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  if (adminEmails.length === 0) {
    logger.error('No admin emails found in ADMIN_EMAILS');
    return false;
  }

  logger.success(`Found ${adminEmails.length} admin email(s): ${adminEmails.join(', ')}`);
  return true;
}

/**
 * Test direct email sending with nodemailer
 */
async function testDirectEmailSending() {
  logger.section('TESTING DIRECT EMAIL WITH NODEMAILER');

  try {
    // Create nodemailer transport
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    // Verify connection
    logger.info('Verifying SMTP connection...');
    await transport.verify();
    logger.success('SMTP connection successful');

    // Extract admin emails
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // Send test email to each admin
    for (const email of adminEmails) {
      if (!email || !email.trim()) continue;

      logger.info(`Sending direct test email to ${email}`);

      const info = await transport.sendMail({
        from: process.env.SMTP_FROM,
        to: email.trim(),
        subject: 'OnnRides Admin Email Diagnostic - Direct',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="color: #f26e24;">OnnRides Admin Email Diagnostic</h1>
            <p>This is a test email sent directly via Nodemailer at ${timestamp}.</p>
            <p><strong>System Info:</strong></p>
            <ul>
              <li>Node version: ${process.version}</li>
              <li>Platform: ${os.platform()} ${os.release()}</li>
              <li>Machine: ${os.hostname()}</li>
            </ul>
            <p>If you received this email, SMTP configuration is working correctly.</p>
          </div>
        `
      });

      logger.success(`Email sent successfully to ${email}: ${info.messageId}`);
    }

    return true;
  } catch (error) {
    logger.error('SMTP test failed:', error.message);
    if (error.code) {
      logger.error(`Error code: ${error.code}`);
    }
    return false;
  }
}

/**
 * Check related code files
 */
async function checkCodeFiles() {
  logger.section('CHECKING ADMIN EMAIL CODE FILES');

  const filesToCheck = [
    'app/api/payment/verify/route.ts',
    'app/api/payment/webhook/route.ts',
    'lib/email/service.ts',
    'app/api/admin/notifications/test/route.ts'
  ];

  for (const filePath of filesToCheck) {
    try {
      const fullPath = resolve(projectRoot, filePath);
      const content = await fs.readFile(fullPath, 'utf8');
      
      // Look for admin notification patterns
      const adminEmailVar = content.includes('ADMIN_EMAILS');
      const adminNotification = content.includes('admin') && content.includes('notification');
      const sendEmailFn = content.includes('sendEmail') || content.includes('sendAdminEmail');

      logger.info(`File ${filePath}:`);
      logger.info(`  - Contains ADMIN_EMAILS reference: ${adminEmailVar ? 'Yes' : 'No'}`);
      logger.info(`  - Contains admin notification code: ${adminNotification ? 'Yes' : 'No'}`);
      logger.info(`  - Contains email sending function: ${sendEmailFn ? 'Yes' : 'No'}`);
      
      // Check for specific patterns
      if (content.includes('process.env.ADMIN_EMAILS')) {
        logger.success('  - Uses process.env.ADMIN_EMAILS correctly');
      } else if (adminEmailVar) {
        logger.warn('  - Uses ADMIN_EMAILS but not from process.env directly');
      }
    } catch (error) {
      logger.error(`Failed to analyze ${filePath}: ${error.message}`);
    }
  }
}

/**
 * Test the admin email check API endpoint if the server is running
 */
async function testAdminEmailApi() {
  logger.section('TESTING ADMIN EMAIL CHECK API');
  
  try {
    const baseUrl = 'http://localhost:3000';
    logger.info(`Attempting to call ${baseUrl}/api/admin/check-emails`);
    
    // Note: This will fail without authentication, but we can see if the endpoint exists
    const response = await fetch(`${baseUrl}/api/admin/check-emails`);
    
    if (response.status === 404) {
      logger.error('API endpoint not found - have you started the development server?');
    } else if (response.status === 403) {
      logger.success('API endpoint exists (returned 403 forbidden as expected without auth)');
    } else {
      const data = await response.json();
      logger.info(`API response status: ${response.status}`);
      logger.info('API response data:', data);
    }
  } catch (error) {
    logger.error('Failed to test API endpoint:', error.message);
    logger.warn('Is the development server running? Try: npm run dev');
  }
}

/**
 * Update Prisma schema to include AdminNotification model
 */
async function createAdminNotificationPrismaModel() {
  logger.section('CHECKING PRISMA SCHEMA FOR ADMIN NOTIFICATIONS');
  
  try {
    const prismaSchemaPath = resolve(projectRoot, 'prisma/schema.prisma');
    let schema = await fs.readFile(prismaSchemaPath, 'utf8');
    
    // Check if AdminNotification model already exists
    if (schema.includes('model AdminNotification {')) {
      logger.success('AdminNotification model already exists in schema');
      return;
    }
    
    // Create model if it doesn't exist
    logger.info('AdminNotification model not found in schema, suggesting model to add');
    
    const modelToAdd = `
model AdminNotification {
  id          String   @id @default(uuid())
  type        String   // 'booking', 'payment', 'document', 'account', 'system', 'test'
  title       String
  recipient   String
  channel     String   // 'email', 'whatsapp'
  status      String   // 'delivered', 'failed'
  error       String?
  data        String?  // JSON stringified data
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  @@index([type, status])
  @@index([recipient, channel])
  @@index([created_at])
}`;
    
    logger.info('Suggested Prisma model to add:');
    console.log(modelToAdd);
    
    logger.warn('Please manually add this model to your Prisma schema and run prisma migrate');
    logger.warn('Command to run after adding: npx prisma migrate dev --name add_admin_notification');
  } catch (error) {
    logger.error('Failed to check Prisma schema:', error);
  }
}

/**
 * Test the AdminNotificationService
 */
async function testAdminNotificationService() {
  logger.section('TESTING ADMIN NOTIFICATION SERVICE');
  
  try {
    logger.info('This would test the AdminNotificationService directly');
    logger.info('But requires importing TypeScript modules which is complex in a script');
    logger.info('Instead, here are key areas to check:');
    
    logger.info('1. Check if library is imported correctly in payment handlers');
    logger.info('2. Ensure AdminNotificationService.getInstance() is called correctly');
    logger.info('3. Verify sendNotification methods have try/catch blocks');
    logger.info('4. Check if ADMIN_EMAILS environment variable is used for recipients');
    
    logger.info('For a test, try hitting the admin notification test endpoint:');
    logger.info('GET /api/admin/notifications/test');
    logger.info('Or the new diagnostic endpoint:');
    logger.info('GET /api/admin/check-emails');
  } catch (error) {
    logger.error('Error in testAdminNotificationService:', error);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    logger.section('STARTING ADMIN EMAIL DIAGNOSTIC');
    logger.info(`Node.js version: ${process.version}`);
    logger.info(`Operating system: ${os.type()} ${os.release()} ${os.arch()}`);
    
    // Run checks in sequence
    const envOk = await checkEnvironmentVariables();
    if (!envOk) {
      logger.error('Environment check failed - fix environment variables before continuing');
    }
    
    await testDirectEmailSending();
    await checkCodeFiles();
    await createAdminNotificationPrismaModel();
    await testAdminNotificationService();
    await testAdminEmailApi();
    
    logger.section('DIAGNOSTIC COMPLETE');
    logger.info('Check the logs above for any issues with admin email configuration');
    logger.info('If direct email test succeeded but application emails fail, the issue is likely in the application code.');
    
    logger.section('NEXT STEPS');
    logger.info('1. Run dev server: npm run dev');
    logger.info('2. Try the admin notification test endpoint: /api/admin/notifications/test');
    logger.info('3. Try the admin email check endpoint: /api/admin/check-emails');
    logger.info('4. Check spam folders for the delivered emails');
  } catch (error) {
    logger.error('Diagnostic failed:', error);
  }
}

// Run the main function
main().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
}); 