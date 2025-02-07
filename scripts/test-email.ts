import { config } from 'dotenv';
import { resolve } from 'path';
import nodemailer from 'nodemailer';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

async function testEmail() {
  try {
    console.log('Email Configuration:', {
      host: 'smtp.gmail.com',
      port: 587,
      user: process.env.SMTP_USER,
      from: process.env.SMTP_FROM,
      pass_length: process.env.SMTP_PASS?.length || 0
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // First verify the configuration
    const verifyResult = await transporter.verify();
    console.log('SMTP Configuration verified:', verifyResult);

    // Try sending a test email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: "applegraphicshyd@gmail.com",
      subject: "ONNRIDES Test Email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Test Email</h1>
          <p>This is a test email to verify the email configuration.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        </div>
      `
    });

    console.log('Email sent successfully:', info);
  } catch (error) {
    console.error('Email test failed:', error);
  }
}

testEmail(); 