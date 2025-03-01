// Script to check and diagnose admin email functionality
require('dotenv').config();
const { EmailService } = require('../lib/email/service');
const fetch = require('node-fetch');
const logger = require('../lib/logger');

async function main() {
  console.log('=== ADMIN EMAIL FUNCTIONALITY CHECK ===');
  
  // 1. Check environment variables
  console.log('\n1. Checking environment variables...');
  const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];
  console.log(`Admin emails from env: ${adminEmails.join(', ')}`);
  console.log(`SMTP Configuration:
  - Host: ${process.env.SMTP_HOST}
  - Port: ${process.env.SMTP_PORT}
  - User: ${process.env.SMTP_USER?.substring(0, 3)}...
  - From: ${process.env.SMTP_FROM}
  `);

  // 2. Try sending a test email to each admin
  console.log('\n2. Testing direct email sending to admins...');
  
  try {
    // Initialize email service (requires dynamic import in Node.js)
    const { default: path } = await import('path');
    const { default: { fileURLToPath } } = await import('url');
    
    // Need to dynamically resolve module paths
    const emailServicePath = path.resolve(__dirname, '../lib/email/service');
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

  console.log('\n=== CHECK COMPLETE ===');
}

main().catch(console.error); 