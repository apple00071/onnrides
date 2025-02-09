import { transporter, defaultMailOptions } from './config';
import { createBookingConfirmationEmail, createPasswordResetEmail, createWelcomeEmail } from './templates';
import logger from '../logger';
import { query } from '../db';
import { format } from 'date-fns-tz';

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

// Generic send email function with retry logic
async function sendEmail(options: any, retryCount = 0): Promise<any> {
  try {
    const mailOptions = {
      ...defaultMailOptions,
      ...options
    };

    logger.info('Attempting to send email:', {
      to: mailOptions.to,
      subject: mailOptions.subject,
      retry_count: retryCount
    });

    const info = await transporter.sendMail(mailOptions);
    
    logger.info('Email sent successfully:', {
      messageId: info.messageId,
      response: info.response,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    return info;
  } catch (error) {
    logger.error('Email send attempt failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      retry_count: retryCount,
      max_retries: MAX_RETRIES
    });

    if (retryCount < MAX_RETRIES) {
      logger.info(`Retrying email send (${retryCount + 1}/${MAX_RETRIES})...`);
      await delay(RETRY_DELAY * (retryCount + 1));
      return sendEmail(options, retryCount + 1);
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
    // Validate email configuration first
    validateEmailConfig();

    const displayId = getBookingDisplayId(booking);

    logger.info('Preparing to send booking confirmation email', {
      bookingId: booking.id,
      displayId,
      payment_reference: booking.payment_reference,
      payment_status: booking.paymentStatus,
      userEmail,
      booking_details: {
        id: booking.id,
        display_id: displayId,
        vehicle: booking.vehicle?.name,
        start_date: booking.startDate,
        end_date: booking.endDate,
        pickup_location: booking.pickupLocation,
        payment_reference: booking.payment_reference,
        payment_status: booking.paymentStatus
      }
    });

    const formattedPaymentStatus = formatPaymentStatus(booking.paymentStatus);
    const statusColor = formattedPaymentStatus === 'Payment Successful' ? '#22c55e' : '#ef4444';

    const mailOptions = {
      ...defaultMailOptions,
      to: userEmail,
      subject: `Booking Confirmation - ${displayId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Booking Confirmation</h1>
          <p>Your booking has been confirmed. Here are the details:</p>
          
          <h2>Booking Information</h2>
          <p><strong>Booking ID:</strong> ${displayId}</p>
          <p><strong>Vehicle:</strong> ${booking.vehicle.name}</p>
          <p><strong>Start Date:</strong> ${formatDateTimeIST(booking.startDate)}</p>
          <p><strong>End Date:</strong> ${formatDateTimeIST(booking.endDate)}</p>
          <p><strong>Pickup Location:</strong> ${booking.pickupLocation}</p>
          <p><strong>Total Amount:</strong> ${booking.totalPrice}</p>
          
          <h2>Payment Information</h2>
          <p><strong>Payment Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${formattedPaymentStatus}</span></p>
          <p><strong>Payment ID:</strong> ${booking.payment_reference}</p>
          <p><strong>Transaction Date:</strong> ${formatDateTimeIST(new Date())}</p>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
            <p style="margin: 0; color: #666;">
              Please save these details for future reference:
              <br>• Booking ID: ${displayId}
              <br>• Payment ID: ${booking.payment_reference}
              <br>• Payment Status: ${formattedPaymentStatus}
            </p>
          </div>
          
          <p style="margin-top: 20px;">If you have any questions, please contact our support team.</p>
          
          <p>Thank you for choosing our service!</p>
        </div>
      `
    };

    const result = await sendEmail(mailOptions);
    
    // Log successful email
    await logEmailSent({
      recipient: userEmail,
      subject: mailOptions.subject,
      booking_id: booking.id,
      status: 'success',
      message_id: result.messageId
    });

    logger.info('Booking confirmation email sent successfully', {
      bookingId: booking.id,
      displayId,
      payment_reference: booking.payment_reference,
      payment_status: formattedPaymentStatus,
      userEmail,
      messageId: result.messageId
    });

    return result;
  } catch (error) {
    // Get display ID even in error case, with safe fallback
    const displayId = booking ? getBookingDisplayId(booking) : 'UNKNOWN';
    
    logger.error('Failed to send booking confirmation email:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      bookingId: booking?.id,
      displayId,
      payment_reference: booking?.payment_reference,
      payment_status: booking?.paymentStatus,
      userEmail,
      emailConfig: {
        smtp_user: process.env.SMTP_USER,
        smtp_from: process.env.SMTP_FROM,
        has_smtp_pass: !!process.env.SMTP_PASS
      }
    });

    // Log failed email with display ID
    await logEmailSent({
      recipient: userEmail,
      subject: `Booking Confirmation - ${displayId}`,
      booking_id: booking?.id,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
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