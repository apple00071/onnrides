import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import logger from '../logger';

// Validate required environment variables
const requiredEnvVars = ['SMTP_USER', 'SMTP_PASS'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Email transporter configuration
const transporterConfig: SMTPTransport.Options = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // Use SSL/TLS
  requireTLS: true,
  auth: {
    type: 'login',
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!.replace(/\s+/g, '') // Remove any whitespace from password
  },
  tls: {
    // Required for Gmail
    minVersion: 'TLSv1.2',
    ciphers: 'HIGH',
    rejectUnauthorized: true
  },
  debug: true, // Enable debug logs
  logger: true // Enable built-in logger
};

// Log configuration without sensitive data
const safeConfig = {
  ...transporterConfig,
  auth: transporterConfig.auth ? {
    type: transporterConfig.auth.type,
    user: transporterConfig.auth.user,
    pass: '****'
  } : undefined
};

logger.info('Creating email transporter with config:', safeConfig);

// Create transporter
export const transporter = nodemailer.createTransport(transporterConfig);

// Default email options
export const defaultMailOptions = {
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
}; 

// Verify email configuration
export async function verifyEmailConfig() {
  try {
    // Log environment variables (excluding sensitive data)
    logger.info('Email environment variables:', {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_FROM: process.env.SMTP_FROM,
      has_SMTP_PASS: !!process.env.SMTP_PASS
    });

    // Verify SMTP connection
    logger.info('Verifying SMTP connection...');
    const verifyResult = await transporter.verify();
    logger.info('SMTP connection verified:', verifyResult);
    
    // Send a test email
    logger.info('Sending test email...');
    const testResult = await transporter.sendMail({
      ...defaultMailOptions,
      to: process.env.SMTP_USER,
      subject: 'ONNRIDES Email Test',
      text: 'This is a test email to verify the email configuration.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Email Configuration Test</h2>
          <p>This is a test email to verify that the email configuration is working correctly.</p>
          <p>Configuration details:</p>
          <ul>
            <li>SMTP Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}</li>
            <li>SMTP Port: ${process.env.SMTP_PORT || '465'}</li>
            <li>SMTP User: ${process.env.SMTP_USER}</li>
            <li>From: ${process.env.SMTP_FROM || process.env.SMTP_USER}</li>
            <li>Timestamp: ${new Date().toISOString()}</li>
          </ul>
          <p>If you received this email, your email configuration is working correctly.</p>
        </div>
      `
    });
    
    logger.info('Test email sent successfully:', {
      messageId: testResult.messageId,
      response: testResult.response,
      accepted: testResult.accepted,
      rejected: testResult.rejected
    });
    
    return true;
  } catch (error) {
    logger.error('Email configuration verification failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      code: error instanceof Error ? (error as any).code : undefined,
      command: error instanceof Error ? (error as any).command : undefined
    });
    
    return false;
  }
} 