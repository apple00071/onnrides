import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import logger from '../logger';

// Skip email configuration in Edge Runtime
if (process.env.NEXT_RUNTIME === 'edge') {
  throw new Error('Email functionality is not supported in Edge Runtime');
}

// Validate required environment variables
const requiredEnvVars = ['SMTP_USER', 'SMTP_PASS'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.warn(`Missing environment variables: ${missingEnvVars.join(', ')}. Email functionality will be disabled.`);
}

// Email transporter configuration
const transporterConfig: SMTPTransport.Options = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: (process.env.SMTP_PASS || '').replace(/\s+/g, '')
  },
  tls: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000
};

// Create transporter with retry mechanism
const createTransporter = () => {
  try {
    const transporter = nodemailer.createTransport(transporterConfig);

    // Add error event handler
    transporter.on('error', (error) => {
      logger.error('SMTP Transport Error:', {
        message: error.message,
        code: (error as any).code,
        command: (error as any).command,
        stack: error.stack
      });
    });

    return transporter;
  } catch (error) {
    logger.error('Failed to create email transporter:', error);
    throw error;
  }
};

export const transporter = createTransporter();

// Default email options
export const defaultMailOptions = {
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  headers: {
    'Content-Type': 'text/html; charset=utf-8'
  }
};

// Verify email configuration
export async function verifyEmailConfig() {
  try {
    const verifyResult = await transporter.verify();
    return verifyResult;
  } catch (error) {
    logger.error('Email configuration verification failed:', error);
    return false;
  }
} 