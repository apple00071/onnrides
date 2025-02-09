import { config } from 'dotenv';
import { resolve } from 'path';
import nodemailer from 'nodemailer';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

async function testEmail() {
  try {
    // Create transporter directly to ensure environment variables are loaded
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    console.log('Email Configuration:', {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      user: process.env.SMTP_USER,
      from: process.env.SMTP_FROM,
      pass_length: process.env.SMTP_PASS?.length || 0
    });

    // First verify the configuration
    const verifyResult = await transporter.verify();
    console.log('SMTP Configuration verified:', verifyResult);

    // Try sending a test email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER, // Send to the same email for testing
      subject: "ONNRIDES Test Email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Test Email</h1>
          <p>This is a test email to verify the email configuration.</p>
          <p>Configuration used:</p>
          <ul>
            <li>SMTP Host: smtp.gmail.com</li>
            <li>SMTP Port: 465 (SSL)</li>
            <li>SMTP User: ${process.env.SMTP_USER}</li>
            <li>From: ${process.env.SMTP_FROM || process.env.SMTP_USER}</li>
          </ul>
          <p>Sent at: ${new Date().toISOString()}</p>
        </div>
      `
    });

    console.log('Email sent successfully:', {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected
    });
  } catch (error) {
    console.error('Email test failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      config: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        user: process.env.SMTP_USER,
        from: process.env.SMTP_FROM,
        has_pass: !!process.env.SMTP_PASS
      }
    });
  }
}

// Print environment variables for debugging
console.log('Environment variables:', {
  SMTP_USER: process.env.SMTP_USER,
  SMTP_FROM: process.env.SMTP_FROM,
  has_SMTP_PASS: !!process.env.SMTP_PASS
});

testEmail().catch(console.error); 