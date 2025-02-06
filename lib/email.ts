import nodemailer from 'nodemailer';
import { logger } from './logger';
import { query } from './db';

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Function to log email to database
async function logEmailSent(data: {
  recipient: string;
  subject: string;
  booking_id?: string;
  status: 'success' | 'failed';
  error?: string;
  message_id?: string;
}) {
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

// Email template for booking confirmation
const createBookingConfirmationEmail = (booking: any) => {
  return {
    subject: `Booking Confirmation - #${booking.id}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f26e24; text-align: center;">Booking Confirmed!</h1>
        
        <div style="background-color: #f8f8f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #333;">Booking Details</h2>
          <p><strong>Booking ID:</strong> ${booking.id}</p>
          <p><strong>Vehicle:</strong> ${booking.vehicle?.name || 'N/A'}</p>
          <p><strong>Start Date:</strong> ${new Date(booking.start_date).toLocaleDateString()}</p>
          <p><strong>End Date:</strong> ${new Date(booking.end_date).toLocaleDateString()}</p>
          <p><strong>Total Amount:</strong> ₹${booking.total_amount}</p>
        </div>

        <div style="margin: 20px 0;">
          <h3 style="color: #333;">Important Information</h3>
          <ul style="padding-left: 20px;">
            <li>Please carry a valid driving license</li>
            <li>Maintain the vehicle in good condition</li>
            <li>Follow all traffic rules and regulations</li>
          </ul>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p>Thank you for choosing ONNRIDES!</p>
          <p style="color: #666; font-size: 12px;">
            If you have any questions, please contact our support team.
          </p>
        </div>
      </div>
    `,
  };
};

// Function to send booking confirmation email
export async function sendBookingConfirmationEmail(booking: any, userEmail: string) {
  try {
    const { subject, html } = createBookingConfirmationEmail(booking);

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: userEmail,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Booking confirmation email sent:', info.messageId);
    
    // Log successful email
    await logEmailSent({
      recipient: userEmail,
      subject,
      booking_id: booking.id,
      status: 'success',
      message_id: info.messageId
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Failed to send booking confirmation email:', error);
    
    // Log failed email
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

// Verify SMTP connection
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

export async function sendResetPasswordEmail(email: string, token: string) {
  try {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <h1>Reset Your Password</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this password reset, please ignore this email.</p>
      `,
    });

    logger.debug('Reset password email sent:', { email });
  } catch (error) {
    logger.error('Failed to send reset password email:', error);
    throw error;
  }
} 