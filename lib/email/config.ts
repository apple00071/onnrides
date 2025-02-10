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
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!.replace(/\s+/g, '') // Remove any whitespace from password
  },
  tls: {
    // Required for Gmail and other secure SMTP servers
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
    ciphers: 'HIGH',
    secureProtocol: 'TLSv1_2_method'
  },
  debug: process.env.NODE_ENV === 'development',
  logger: process.env.NODE_ENV === 'development'
};

// Create transporter with retry mechanism
const createTransporter = () => {
  const transporter = nodemailer.createTransport(transporterConfig);

  // Add error event handler
  transporter.on('error', (error) => {
    logger.error('SMTP Transport Error:', {
      error: error.message,
      code: error.code,
      command: (error as any).command,
      responseCode: (error as any).responseCode,
      stack: error.stack
    });
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
    // Log environment variables (excluding sensitive data)
    logger.info('Email configuration:', {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_FROM: process.env.SMTP_FROM,
      NODE_ENV: process.env.NODE_ENV,
      has_SMTP_PASS: !!process.env.SMTP_PASS
    });

    // Verify SMTP connection
    const verifyResult = await transporter.verify();
    logger.info('SMTP connection verified:', verifyResult);
    
    return true;
  } catch (error) {
    logger.error('Email configuration verification failed:', {
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