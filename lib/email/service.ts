import { transporter, defaultMailOptions } from './config';
import { createBookingConfirmationEmail, createPasswordResetEmail, createWelcomeEmail } from './templates';
import { logger } from '../logger';
import { query } from '../db';
import { format } from 'date-fns-tz';

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
    logger.info('Attempting to send booking confirmation email', {
      bookingId: booking.id,
      userEmail
    });

    // Format dates in IST
    const formatDateIST = (date: string) => {
      return format(new Date(date), 'PPP p', { timeZone: 'Asia/Kolkata' });
    };

    const mailOptions = {
      ...defaultMailOptions,
      to: userEmail,
      subject: `Booking Confirmation - ${booking.displayId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Booking Confirmation</h1>
          <p>Your booking has been confirmed. Here are the details:</p>
          
          <h2>Booking Information</h2>
          <p><strong>Booking ID:</strong> ${booking.displayId}</p>
          <p><strong>Vehicle:</strong> ${booking.vehicle.name}</p>
          <p><strong>Start Date:</strong> ${formatDateIST(booking.startDate)}</p>
          <p><strong>End Date:</strong> ${formatDateIST(booking.endDate)}</p>
          <p><strong>Pickup Location:</strong> ${booking.pickupLocation}</p>
          <p><strong>Total Amount:</strong> ${booking.totalPrice}</p>
          
          <h2>Payment Information</h2>
          <p><strong>Payment Status:</strong> ${booking.paymentStatus}</p>
          <p><strong>Payment Reference:</strong> ${booking.paymentReference || 'N/A'}</p>
          
          <p>If you have any questions, please contact our support team.</p>
          
          <p>Thank you for choosing our service!</p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    
    logger.info('Booking confirmation email sent successfully', {
      bookingId: booking.id,
      userEmail,
      messageId: result.messageId
    });

    return result;
  } catch (error) {
    logger.error('Failed to send booking confirmation email:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      bookingId: booking.id,
      userEmail,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
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
    logger.info('Sending test email to:', email);

    const mailOptions = {
      ...defaultMailOptions,
      to: email,
      subject: 'Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Test Email</h1>
          <p>This is a test email to verify the email configuration.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    
    logger.info('Test email sent successfully', {
      email,
      messageId: result.messageId
    });

    return result;
  } catch (error) {
    logger.error('Failed to send test email:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      email,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
} 