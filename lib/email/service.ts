import { transporter, defaultMailOptions } from './config';
import { createBookingConfirmationEmail, createPasswordResetEmail, createWelcomeEmail } from './templates';
import logger from '../logger';
import { query } from '../db';
import { format } from 'date-fns-tz';

// Skip email functionality in Edge Runtime
if (process.env.NEXT_RUNTIME === 'edge') {
  throw new Error('Email functionality is not supported in Edge Runtime. Please use API routes for sending emails.');
}

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Types
interface EmailLog {
  recipient: string;
  subject: string;
  booking_id?: string;
  status: 'success' | 'failed';
  error?: string;
  message_id?: string;
}

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    
    logger.info('Email log saved successfully', {
      recipient: data.recipient,
      subject: data.subject,
      booking_id: data.booking_id,
      status: data.status,
      message_id: data.message_id
    });
  } catch (error) {
    logger.error('Failed to log email:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      data
    });
  }
}

// Helper function to send email with retry logic
async function sendEmailWithRetry(mailOptions: any, retryCount = 0): Promise<any> {
  try {
    const result = await transporter.sendMail({
      ...defaultMailOptions,
      ...mailOptions
    });

    // Log success
    await logEmailSent({
      recipient: mailOptions.to,
      subject: mailOptions.subject,
      booking_id: mailOptions.booking_id,
      status: 'success',
      message_id: result.messageId
    });

    return result;
  } catch (error) {
    logger.error('Email send error:', {
      error: error instanceof Error ? {
        message: error.message,
        code: (error as any).code,
        command: (error as any).command,
        stack: error.stack
      } : 'Unknown error',
      recipient: mailOptions.to,
      subject: mailOptions.subject,
      retryCount
    });

    // Log failure
    await logEmailSent({
      recipient: mailOptions.to,
      subject: mailOptions.subject,
      booking_id: mailOptions.booking_id,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Retry if not exceeded max retries
    if (retryCount < MAX_RETRIES) {
      await delay(RETRY_DELAY * Math.pow(2, retryCount)); // Exponential backoff
      return sendEmailWithRetry(mailOptions, retryCount + 1);
    }

    throw error;
  }
}

// Format date in IST with consistent format
function formatDateTimeIST(date: string | Date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd MMM yyyy, hh:mm a', { timeZone: 'Asia/Kolkata' });
}

// Format payment status for display
function formatPaymentStatus(status: string): string {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'captured':
      return 'Payment Successful';
    case 'pending':
      return 'Payment Pending';
    case 'failed':
      return 'Payment Failed';
    default:
      return status || 'Unknown';
  }
}

// Validate email configuration
function validateEmailConfig() {
  const requiredEnvVars = {
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(`Missing required email configuration: ${missingVars.join(', ')}`);
  }
}

// Function to get booking display ID
function getBookingDisplayId(booking: any): string {
  const displayId = booking.booking_id || booking.payment_intent_id || booking.id || booking.displayId;
  if (!displayId) {
    throw new Error('Missing booking identifier');
  }
  return displayId;
}

// Send booking confirmation email
export async function sendBookingConfirmationEmail(booking: any, userEmail: string) {
  try {
    const mailOptions = {
      to: userEmail,
      subject: `Booking Confirmation - ${booking.booking_id || booking.id}`,
      booking_id: booking.id,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #f26e24; text-align: center;">Booking Confirmation</h1>
          <p>Dear Customer,</p>
          <p>Your booking has been confirmed. Here are the details:</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Booking ID:</strong> ${booking.booking_id || booking.id}</p>
            <p><strong>Vehicle:</strong> ${booking.vehicle?.name}</p>
            <p><strong>Pickup Location:</strong> ${booking.pickupLocation}</p>
            <p><strong>Start Date:</strong> ${format(new Date(booking.startDate), 'dd MMM yyyy, hh:mm a', { timeZone: 'Asia/Kolkata' })}</p>
            <p><strong>End Date:</strong> ${format(new Date(booking.endDate), 'dd MMM yyyy, hh:mm a', { timeZone: 'Asia/Kolkata' })}</p>
            <p><strong>Total Amount:</strong> ₹${booking.totalPrice}</p>
            <p><strong>Payment Status:</strong> ${formatPaymentStatus(booking.paymentStatus)}</p>
            ${booking.payment_reference ? `<p><strong>Payment Reference:</strong> ${booking.payment_reference}</p>` : ''}
          </div>
          <p>Thank you for choosing our service!</p>
          <p>Best regards,<br>ONNRIDES Team</p>
        </div>
      `
    };

    return await sendEmailWithRetry(mailOptions);
  } catch (error) {
    logger.error('Failed to send booking confirmation email:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      bookingId: booking.id,
      userEmail
    });
    throw error;
  }
}

// Send password reset email
export async function sendPasswordResetEmail(email: string, token: string) {
  try {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
    const emailContent = createPasswordResetEmail(resetUrl);
    
    const info = await sendEmailWithRetry({
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
    const info = await sendEmailWithRetry({
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