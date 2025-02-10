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
  port: 587, // Changed to 587 for TLS
  secure: false, // Changed to false for TLS
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!.replace(/\s+/g, '') // Remove any whitespace from password
  },
  tls: {
    // Required for Gmail and other secure SMTP servers
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
    ciphers: 'HIGH'
  },
  debug: true, // Always enable debug for troubleshooting
  logger: true // Always enable logger for troubleshooting
};

// Create transporter with retry mechanism
const createTransporter = () => {
  console.log('Creating email transporter with config:', {
    ...transporterConfig,
    auth: {
      ...transporterConfig.auth,
      pass: '****' // Hide password in logs
    }
  });

  const transporter = nodemailer.createTransport(transporterConfig);

  // Add error event handler
  transporter.on('error', (error: Error & { code?: string; command?: string; responseCode?: number }) => {
    console.error('SMTP Transport Error:', {
      message: error.message,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      stack: error.stack
    });
  });

  // Verify transporter configuration
  transporter.verify((error, success) => {
    if (error) {
      console.error('Transporter verification failed:', {
        message: error.message,
        code: (error as any).code,
        stack: error.stack
      });
    } else {
      console.log('Transporter is ready to send emails:', success);
    }
  });

  return transporter;
};

export const transporter = createTransporter();

// Default email options
export const defaultMailOptions = {
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
};

// Verify email configuration
export async function verifyEmailConfig() {
  try {
    console.log('Verifying email configuration...');
    console.log('Environment variables:', {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_FROM: process.env.SMTP_FROM,
      NODE_ENV: process.env.NODE_ENV,
      has_SMTP_PASS: !!process.env.SMTP_PASS
    });

    // Verify SMTP connection
    const verifyResult = await transporter.verify();
    console.log('SMTP connection verified:', verifyResult);
    
    // Send a test email to verify full functionality
    const testResult = await transporter.sendMail({
      ...defaultMailOptions,
      to: process.env.SMTP_USER,
      subject: 'SMTP Test',
      text: 'If you receive this email, SMTP is working correctly.'
    });
    
    console.log('Test email sent:', {
      messageId: testResult.messageId,
      response: testResult.response,
      accepted: testResult.accepted,
      rejected: testResult.rejected
    });
    
    return true;
  } catch (error) {
    console.error('Email configuration verification failed:', {
      error: error instanceof Error ? {
        message: error.message,
        code: (error as any).code,
        command: (error as any).command,
        stack: error.stack
      } : 'Unknown error'
    });
    
    // Recreate transporter on verification failure
    createTransporter();
    return false;
  }
} 