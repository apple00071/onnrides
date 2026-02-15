import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import logger from '../logger';
import { query } from '@/lib/db';
import { randomUUID } from 'crypto';

export interface BookingConfirmationData {
  userName: string;
  vehicleName: string;
  bookingId: string;
  startDate: string;
  endDate: string;
  amount: string;
  paymentId: string;
}

export interface PaymentFailureData {
  userName: string;
  bookingId: string;
  amount: string;
  orderId: string;
  paymentId: string;
  supportEmail: string;
  supportPhone: string;
}

export interface PasswordResetData {
  name: string;
  resetLink: string;
  supportEmail: string;
}

export interface DocumentUploadReminderData {
  name: string;
  bookingId: string;
  uploadUrl: string;
  supportEmail: string;
  deadline?: string;
}

export class EmailService {
  private static instance: EmailService;
  private transporter!: Transporter;
  private initialized: boolean = false;
  private initializationPromise: Promise<void>;
  private initializationError: Error | null = null;

  private constructor() {
    this.initializationPromise = this.initialize();
  }

  private async initialize() {
    try {
      // Validate required environment variables
      const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'EMAIL_FROM'];
      const missingVars = requiredVars.filter(varName => !process.env[varName]);

      if (missingVars.length > 0) {
        const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}`;
        logger.error(errorMsg);
        this.initializationError = new Error(errorMsg);
        throw this.initializationError;
      }

      // Create transporter with secure configuration
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      // Verify connection
      try {
        await this.transporter.verify();
        logger.info('Email service SMTP connection verified successfully');
      } catch (verifyError) {
        logger.error('SMTP connection verification failed:', verifyError);
        this.initializationError = verifyError instanceof Error ? verifyError : new Error('SMTP verification failed');
        throw this.initializationError;
      }

      this.initialized = true;
    } catch (error) {
      this.initialized = false;
      this.initializationError = error instanceof Error ? error : new Error('Unknown error initializing email service');
      logger.error('Failed to initialize email service:', error);
    }
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private async waitForInitialization(): Promise<void> {
    if (!this.initialized) {
      try {
        await this.initializationPromise;
      } catch (error) {
        logger.error('Email service initialization failed during wait:', error);
      }
    }
  }

  async sendEmail(to: string, subject: string, html: string, bookingId?: string | null): Promise<{ messageId: string; logId: string }> {
    try {
      await this.waitForInitialization();

      if (!to || !to.includes('@')) {
        throw new Error('Invalid recipient email address');
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html
      };

      // Log the attempt
      const logId = await this.logEmail(to, subject, html, 'pending', bookingId);

      try {
        const info = await this.transporter.sendMail(mailOptions);

        // Update log with success
        await this.updateEmailLog(logId, {
          status: 'success',
          messageId: info.messageId
        });

        logger.info('Email sent successfully', {
          to,
          subject,
          messageId: info.messageId,
          bookingId
        });

        return { messageId: info.messageId, logId };
      } catch (error) {
        // Update log with failure
        await this.updateEmailLog(logId, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        throw error;
      }
    } catch (error) {
      logger.error('Failed to send email:', {
        error,
        to,
        subject,
        bookingId
      });
      throw error;
    }
  }

  private async logEmail(
    recipient: string,
    subject: string,
    message: string,
    status: string = 'pending',
    bookingId?: string | null
  ): Promise<string> {
    try {
      const id = randomUUID();
      await query(`
        INSERT INTO email_logs (
          id,
          recipient,
          subject,
          message_content,
          booking_id,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [id, recipient, subject, message, bookingId, status]);

      return id;
    } catch (error) {
      logger.error('Error logging email:', error);
      return randomUUID();
    }
  }

  private async updateEmailLog(
    id: string,
    updates: { status: string; messageId?: string; error?: string }
  ): Promise<void> {
    try {
      await query(`
        UPDATE email_logs SET
          status = $1,
          message_id = $2,
          error = $3,
          updated_at = NOW()
        WHERE id = $4
      `, [updates.status, updates.messageId, updates.error, id]);
    } catch (error) {
      logger.error('Error updating email log:', error);
    }
  }

  public async sendBookingConfirmation(
    toEmail: string,
    data: BookingConfirmationData
  ): Promise<void> {
    const html = this.createBookingConfirmationHtml(data);
    await this.sendEmail(toEmail, 'Booking Confirmation', html, data.bookingId);
  }

  private createBookingConfirmationHtml(data: BookingConfirmationData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Booking Confirmation</h2>
        <p>Dear ${data.userName},</p>
        <p>Your booking has been confirmed. Here are the details:</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
          <p><strong>Booking ID:</strong> ${data.bookingId}</p>
          <p><strong>Vehicle:</strong> ${data.vehicleName}</p>
          <p><strong>Start Date:</strong> ${data.startDate}</p>
          <p><strong>End Date:</strong> ${data.endDate}</p>
          <p><strong>Amount:</strong> ${data.amount}</p>
          <p><strong>Payment ID:</strong> ${data.paymentId}</p>
        </div>
        <p>Thank you for choosing our service!</p>
        <p>Best regards,<br>OnnRides Team</p>
      </div>
    `;
  }

  public async sendPaymentFailure(
    to: string,
    data: PaymentFailureData
  ): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Failed</h2>
        <p>Dear ${data.userName},</p>
        <p>We regret to inform you that your payment for booking ${data.bookingId} has failed.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
          <p><strong>Amount:</strong> ${data.amount}</p>
          <p><strong>Order ID:</strong> ${data.orderId}</p>
          <p><strong>Payment ID:</strong> ${data.paymentId}</p>
        </div>
        <p>Please try again or contact our support team for assistance:</p>
        <p>Email: ${data.supportEmail}<br>Phone: ${data.supportPhone}</p>
        <p>Best regards,<br>OnnRides Team</p>
      </div>
    `;
    await this.sendEmail(to, 'Payment Failed', html, data.bookingId);
  }

  public async sendDocumentUploadReminder(
    to: string,
    data: DocumentUploadReminderData
  ): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Document Upload Reminder</h2>
        <p>Dear ${data.name},</p>
        <p>This is a reminder to upload your required documents for booking ${data.bookingId}.</p>
        <p>Please upload your documents within ${data.deadline || '24 hours'} to avoid booking cancellation.</p>
        <p><a href="${data.uploadUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Upload Documents</a></p>
        <p>If you need assistance, please contact our support team at ${data.supportEmail}.</p>
        <p>Best regards,<br>OnnRides Team</p>
      </div>
    `;
    await this.sendEmail(to, 'Document Upload Reminder', html, data.bookingId);
  }

  public async sendPasswordResetEmail(
    to: string,
    data: PasswordResetData
  ): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>Dear ${data.name},</p>
        <p>You have requested to reset your password. Click the link below to proceed:</p>
        <p><a href="${data.resetLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
        <p>If you did not request this, please ignore this email or contact support at ${data.supportEmail}.</p>
        <p>Best regards,<br>OnnRides Team</p>
      </div>
    `;
    await this.sendEmail(to, 'Password Reset', html);
  }
  public getInitializationStatus(): { isInitialized: boolean; error: Error | null } {
    return { isInitialized: this.initialized, error: this.initializationError };
  }
}