import nodemailer from 'nodemailer';
import { logger } from '../logger';

// Email transporter configuration
export const transporter = nodemailer.createTransport({
  service: 'gmail',  // Use Gmail service
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify email configuration on startup
export async function verifyEmailConfig() {
  try {
    await transporter.verify();
    logger.info('SMTP connection verified successfully');
    return true;
  } catch (error) {
    logger.error('SMTP connection verification failed:', error);
    return false;
  }
}

// Default email options
export const defaultMailOptions = {
  from: process.env.SMTP_FROM,
}; 