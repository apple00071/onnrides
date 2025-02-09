import nodemailer from 'nodemailer';
import { logger } from '../logger';

// Email transporter configuration
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: parseInt(process.env.SMTP_PORT || '587') === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Default email options
export const defaultMailOptions = {
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
}; 

// Verify email configuration
export async function verifyEmailConfig() {
  try {
    // Validate required environment variables
    const requiredEnvVars = ['SMTP_USER', 'SMTP_PASS'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }

    // Log current configuration
    logger.info('Verifying email configuration with:', {
      smtp_host: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtp_port: parseInt(process.env.SMTP_PORT || '587'),
      smtp_user: process.env.SMTP_USER,
      smtp_from: process.env.SMTP_FROM || process.env.SMTP_USER,
      has_smtp_pass: !!process.env.SMTP_PASS
    });

    // Verify SMTP connection
    const verifyResult = await transporter.verify();
    
    logger.info('SMTP connection verified successfully', {
      result: verifyResult,
      isConnected: true
    });
    
    return true;
  } catch (error) {
    logger.error('SMTP connection verification failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      smtp_host: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtp_port: parseInt(process.env.SMTP_PORT || '587'),
      smtp_user: process.env.SMTP_USER,
      smtp_from: process.env.SMTP_FROM || process.env.SMTP_USER,
      has_smtp_pass: !!process.env.SMTP_PASS
    });
    
    return false;
  }
} 