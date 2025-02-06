import { transporter, defaultMailOptions } from './config';
import { createBookingConfirmationEmail, createPasswordResetEmail, createWelcomeEmail } from './templates';
import { logger } from '../logger';
import { query } from '../db';

// Types
interface EmailLog {
  recipient: string;
  subject: string;
  booking_id?: string;
  status: 'success' | 'failed';
  error?: string;
  message_id?: string;
}

// Function to log email to database
async function logEmailSent(data: EmailLog) {
  try {
    await query(
      `INSERT INTO email_logs 
       (recipient, subject, booking_id, status, error, message_id, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        data.recipient,
        data.subject,
        data.booking_id,
        data.status,
        data.error,
        data.message_id
      ]
    );
  } catch (error) {
    logger.error('Failed to log email:', error);
  }
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generic send email function with retry logic
async function sendEmail(options: any, retryCount = 0): Promise<any> {
  try {
    const mailOptions = {
      ...defaultMailOptions,
      ...options
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      logger.warn(`Email send failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
      await delay(RETRY_DELAY * (retryCount + 1));
      return sendEmail(options, retryCount + 1);
    }
    throw error;
  }
}

// Send booking confirmation email
export async function sendBookingConfirmationEmail(booking: any, userEmail: string) {
  try {
    const emailContent = createBookingConfirmationEmail(booking);
    const info = await sendEmail({
      to: userEmail,
      ...emailContent
    });

    await logEmailSent({
      recipient: userEmail,
      subject: emailContent.subject,
      booking_id: booking.id,
      status: 'success',
      message_id: info.messageId
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Failed to send booking confirmation email:', error);
    
    await logEmailSent({
      recipient: userEmail,
      subject: `Booking Confirmation - #${booking.id}`,
      booking_id: booking.id,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw new Error('Failed to send booking confirmation email');
  }
}

// Send password reset email
export async function sendPasswordResetEmail(email: string, token: string) {
  try {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
    const emailContent = createPasswordResetEmail(resetUrl);
    
    const info = await sendEmail({
      to: email,
      ...emailContent
    });

    await logEmailSent({
      recipient: email,
      subject: emailContent.subject,
      status: 'success',
      message_id: info.messageId
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Failed to send password reset email:', error);
    
    await logEmailSent({
      recipient: email,
      subject: 'Reset Your Password - ONNRIDES',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw new Error('Failed to send password reset email');
  }
}

// Send welcome email
export async function sendWelcomeEmail(email: string, name: string) {
  try {
    const emailContent = createWelcomeEmail(name);
    const info = await sendEmail({
      to: email,
      ...emailContent
    });

    await logEmailSent({
      recipient: email,
      subject: emailContent.subject,
      status: 'success',
      message_id: info.messageId
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Failed to send welcome email:', error);
    
    await logEmailSent({
      recipient: email,
      subject: 'Welcome to ONNRIDES! 🎉',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw new Error('Failed to send welcome email');
  }
}

// Add this new function with the existing ones
export async function sendTestEmail(email: string) {
  try {
    const info = await sendEmail({
      to: email,
      subject: 'ONNRIDES Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f26e24; text-align: center;">Email Configuration Test</h1>
          
          <div style="background-color: #f8f8f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333;">Success! 🎉</h2>
            <p>If you're reading this, it means your email configuration is working correctly.</p>
            <p>You can now proceed with using the booking system.</p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <p>Test completed at: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `
    });

    await logEmailSent({
      recipient: email,
      subject: 'ONNRIDES Email Test',
      status: 'success',
      message_id: info.messageId
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Failed to send test email:', error);
    
    await logEmailSent({
      recipient: email,
      subject: 'ONNRIDES Email Test',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw new Error('Failed to send test email');
  }
} 