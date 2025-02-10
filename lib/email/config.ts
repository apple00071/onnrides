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
  port: 465, // Use 465 for SSL in production
  secure: true, // Use SSL in production
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!.replace(/\s+/g, '') // Remove any whitespace from password
  },
  tls: {
    // Required for Gmail and other secure SMTP servers
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
    ciphers: 'HIGH',
    servername: process.env.SMTP_HOST || 'smtp.gmail.com' // Add explicit servername
  },
  name: 'ONNRIDES-SMTP', // Add a name for the connection
  connectionTimeout: 5000, // 5 seconds
  greetingTimeout: 5000,
  socketTimeout: 5000,
  debug: process.env.NODE_ENV === 'development',
  logger: process.env.NODE_ENV === 'development'
};

// Create transporter with retry mechanism
const createTransporter = () => {
  logger.info('Creating email transporter with config:', {
    host: transporterConfig.host,
    port: transporterConfig.port,
    secure: transporterConfig.secure,
    requireTLS: transporterConfig.requireTLS,
    auth: { user: transporterConfig.auth?.user, pass: '****' },
    tls: {
      minVersion: transporterConfig.tls?.minVersion,
      servername: transporterConfig.tls?.servername
    }
  });

  const transporter = nodemailer.createTransport(transporterConfig);

  // Add error event handler
  transporter.on('error', (error: Error & { code?: string; command?: string; responseCode?: number }) => {
    logger.error('SMTP Transport Error:', {
      message: error.message,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      stack: error.stack,
      env: process.env.NODE_ENV
    });
  });

  // Verify transporter configuration
  transporter.verify((error, success) => {
    if (error) {
      logger.error('Transporter verification failed:', {
        message: error.message,
        code: (error as any).code,
        stack: error.stack,
        env: process.env.NODE_ENV
      });
    } else {
      logger.info('Transporter is ready to send emails:', success);
    }
  });

  return transporter;
};

export const transporter = createTransporter();

// Default email options with proper headers
export const defaultMailOptions = {
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  headers: {
    'X-Priority': '1',
    'X-MSMail-Priority': 'High',
    'Importance': 'high',
    'Content-Type': 'text/html; charset=utf-8'
  }
};

// Verify email configuration
export async function verifyEmailConfig() {
  try {
    logger.info('Verifying email configuration...', {
      env: process.env.NODE_ENV,
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || '465',
      user: process.env.SMTP_USER,
      from: process.env.SMTP_FROM,
      has_smtp_pass: !!process.env.SMTP_PASS
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
      } : 'Unknown error',
      env: process.env.NODE_ENV
    });
    
    // Recreate transporter on verification failure
    createTransporter();
    return false;
  }
} 