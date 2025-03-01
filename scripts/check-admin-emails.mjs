// ESM-compatible script to check and diagnose admin email functionality
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Initialize dotenv
dotenv.config();

// Setup require for CommonJS modules
const require = createRequire(import.meta.url);
const logger = require('../lib/logger');

// Use import.meta.url to get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('=== ADMIN EMAIL FUNCTIONALITY CHECK ===');
  
  // 1. Check environment variables
  console.log('\n1. Checking environment variables...');
  const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];
  console.log(`Admin emails from env: ${JSON.stringify(adminEmails)}`);
  console.log(`SMTP Configuration:
  - Host: ${process.env.SMTP_HOST}
  - Port: ${process.env.SMTP_PORT}
  - User: ${process.env.SMTP_USER?.substring(0, 3)}...
  - From: ${process.env.SMTP_FROM}
  `);

  // 2. Try sending a test email to each admin
  console.log('\n2. Testing direct email sending to admins...');
  
  try {
    // Dynamically import the email service
    const emailServicePath = path.join(__dirname, '../lib/email/service.js');
    const { EmailService } = await import(emailServicePath);
    
    const emailService = EmailService.getInstance();
    console.log('Email service initialized successfully');
    
    for (const email of adminEmails) {
      try {
        console.log(`Sending test email to admin: ${email}`);
        const result = await emailService.sendEmail(
          email,
          'Admin Email Test',
          `
          <h1>Admin Email Test</h1>
          <p>This is a test email to verify admin notification functionality.</p>
          <p>Time: ${new Date().toISOString()}</p>
          `
        );
        console.log(`Email sent successfully to ${email}, message ID: ${result.messageId}`);
      } catch (error) {
        console.error(`Failed to send email to ${email}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error initializing email service:', error);
  }

  // 3. Check API endpoint
  console.log('\n3. Testing API endpoint for admin notifications...');
  try {
    const response = await fetch(`http://localhost:3000/api/email/test`);
    const data = await response.json();
    console.log('API test response:', data);
  } catch (error) {
    console.error('Error testing API endpoint:', error.message);
  }
  
  // 4. Check admin notification API
  console.log('\n4. Testing admin notification endpoint...');
  try {
    // Attempt to make a request to the admin notifications test endpoint
    // This will likely fail due to authentication, but we'll log the response
    const response = await fetch(`http://localhost:3000/api/admin/notifications/test`);
    const data = await response.json();
    console.log('Admin notification test response:', data);
  } catch (error) {
    console.error('Error testing admin notification endpoint:', error.message);
  }

  console.log('\n=== CHECK COMPLETE ===');
}

main().catch(console.error); 