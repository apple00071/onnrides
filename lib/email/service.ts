import nodemailer from 'nodemailer';
import logger from '@/lib/logger';
import { query } from '../db';

interface EmailLog {
  recipient: string;
  subject: string;
  message_content: string;
  booking_id?: string | null;
  status: 'pending' | 'success' | 'failed';
  error?: string;
  message_id?: string;
}

interface BookingConfirmationData {
  userName: string;
  vehicleName: string;
  bookingId: string;
  startDate: string;
  endDate: string;
  amount: string;
  paymentId: string;
}

interface PaymentFailureData {
  userName: string;
  bookingId: string;
  amount: string;
  orderId: string;
  paymentId: string;
  supportEmail: string;
  supportPhone: string;
}

interface EmailContent {
  subject: string;
  template: string;
  data: Record<string, any>;
}

interface DocumentUploadReminderData {
  name: string;
  bookingId: string;
  uploadUrl: string;
  supportEmail: string;
  deadline?: string;
}

export class EmailService {
  private static instance: EmailService;
  private transporter!: nodemailer.Transporter;
  private isInitialized: boolean = false;
  private initializationError: Error | null = null;
  private readonly maxRetries = 3;
  private readonly retryDelay = 5000; // 5 seconds

  private constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      // Log all email-related environment variables (excluding sensitive values)
      logger.info('Checking email configuration:', {
        SMTP_HOST: process.env.SMTP_HOST || 'not set',
        SMTP_PORT: process.env.SMTP_PORT || 'not set',
        SMTP_USER: process.env.SMTP_USER ? 'set' : 'not set',
        SMTP_PASSWORD: process.env.SMTP_PASSWORD ? 'set' : 'not set',
        SMTP_FROM: process.env.SMTP_FROM || 'not set'
      });

      // Validate required environment variables
      const requiredVars = {
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASSWORD: process.env.SMTP_PASSWORD,
        SMTP_FROM: process.env.SMTP_FROM
      };

      const missingVars = Object.entries(requiredVars)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

      if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
      }

      const port = parseInt(process.env.SMTP_PORT || '465', 10);
      const secure = process.env.SMTP_SECURE === 'true' || port === 465;

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: port,
        secure: secure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
        tls: {
          rejectUnauthorized: true
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
      });

      // Test the connection
      logger.info('Testing SMTP connection...');
      await this.transporter.verify();
      
      this.isInitialized = true;
      logger.info('Email service initialized successfully with config:', {
        host: process.env.SMTP_HOST,
        port: port,
        secure: secure,
        user: process.env.SMTP_USER,
        hasPassword: !!process.env.SMTP_PASSWORD
      });
    } catch (error) {
      const emailError = error as { code?: string; message?: string; command?: string };
      
      if (emailError.code === 'EAUTH') {
        logger.error('Email authentication failed. Please check your SMTP credentials and ensure you are using an App Password for Gmail');
      }

      this.initializationError = error instanceof Error ? error : new Error('Unknown error during initialization');
      logger.error('Failed to initialize email service:', {
        error: emailError.message || 'Unknown error',
        code: emailError.code,
        command: emailError.command
      });
    }
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private async logEmail(log: EmailLog): Promise<string> {
    try {
      // For test emails, don't include booking_id if it doesn't match UUID format
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const bookingId = log.booking_id && isValidUUID.test(log.booking_id) ? log.booking_id : null;

      const result = await query(
        `INSERT INTO email_logs (recipient, subject, message_content, booking_id, status, error, message_id)
         VALUES ($1, $2, $3, $4::uuid, $5, $6, $7)
         RETURNING id`,
        [
          log.recipient,
          log.subject,
          log.message_content,
          bookingId,
          log.status,
          log.error || null,
          log.message_id || null
        ]
      );
      return result.rows[0].id;
    } catch (error) {
      logger.error('Failed to log email:', error);
      throw error;
    }
  }

  private async updateEmailLog(id: string, updates: Partial<EmailLog>): Promise<void> {
    try {
      const setClauses = Object.entries(updates)
        .map(([key, _], index) => `${key} = $${index + 2}`)
        .join(', ');

      await query(
        `UPDATE email_logs 
         SET ${setClauses}
         WHERE id = $1`,
        [id, ...Object.values(updates)]
      );
    } catch (error) {
      logger.error('Failed to update email log:', error);
    }
  }

  private getEmailTemplate(template: string, data: Record<string, any>): string {
    switch (template) {
      case 'document_upload_reminder':
        return `
          <h2>Hello ${data.name},</h2>
          <p>This is a reminder to upload your required documents for booking ID: ${data.bookingId}.</p>
          <p>Please upload your documents within 24 hours to avoid booking cancellation.</p>
          <p>You can upload your documents here: <a href="${data.uploadUrl}">${data.uploadUrl}</a></p>
          <p>Required documents:</p>
          <ul>
            <li>Valid ID Proof</li>
            <li>Driving License</li>
            <li>Address Proof</li>
          </ul>
          <p>If you need any assistance, please contact us at ${data.supportEmail}.</p>
          <p>Best regards,<br>OnnRides Team</p>
        `;

      case 'booking_confirmation':
        return `
          <h2>Hello ${data.name},</h2>
          <p>Your booking has been confirmed!</p>
          <p><strong>Booking Details:</strong></p>
          <ul>
            <li>Booking ID: ${data.bookingId}</li>
            <li>Vehicle: ${data.vehicleName}</li>
            <li>Start Date: ${data.startDate}</li>
            <li>End Date: ${data.endDate}</li>
            <li>Total Amount: ₹${data.totalAmount}</li>
          </ul>
          <p><strong>Important:</strong> Please upload your required documents within 24 hours to avoid booking cancellation.</p>
          <p>You can upload your documents here: <a href="${data.uploadUrl}">${data.uploadUrl}</a></p>
          <p>Required documents:</p>
          <ul>
            <li>Valid ID Proof</li>
            <li>Driving License</li>
            <li>Address Proof</li>
          </ul>
          <p>If you need any assistance, please contact us at ${data.supportEmail}.</p>
          <p>Best regards,<br>OnnRides Team</p>
        `;

      default:
        throw new Error(`Unknown email template: ${template}`);
    }
  }

  private async queueEmail(to: string, content: EmailContent, priority: number = 0): Promise<void> {
    try {
      const result = await query(
        `INSERT INTO notification_queue (
          type,
          recipient,
          data,
          status,
          priority,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id`,
        [
          `email_${content.template}`,
          to,
          JSON.stringify({
            ...content,
            attempts: 0,
            lastAttempt: null
          }),
          'pending',
          priority
        ]
      );

      logger.info('Email queued successfully:', {
        recipient: to,
        template: content.template,
        queueId: result.rows[0].id
      });
    } catch (error) {
      logger.error('Failed to queue email:', error);
      throw error;
    }
  }

  public async sendEmail(to: string, content: EmailContent, priority: number = 0): Promise<void> {
    try {
      // Always queue the email first
      await this.queueEmail(to, content, priority);

      // If email service is not initialized, just return as the queue will handle it
      if (!this.isInitialized) {
        logger.warn('Email service not initialized, message queued for later delivery');
        return;
      }

      // Attempt immediate delivery if possible
      const emailContent = this.getEmailTemplate(content.template, content.data);
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject: content.subject,
        html: emailContent,
      });

      logger.info('Email sent successfully:', {
        recipient: to,
        template: content.template
      });
    } catch (error) {
      logger.error('Failed to send email:', error);
      // Don't throw since it's queued
    }
  }

  public async sendBookingConfirmation(
    to: string,
    data: BookingConfirmationData
  ): Promise<void> {
    const subject = 'Booking Confirmation - OnnRides';
    const html = `
      <h2>Booking Confirmation</h2>
      <p>Hello ${data.userName},</p>
      <p>Your booking has been confirmed!</p>
      
      <h3>Booking Details:</h3>
      <ul>
        <li>Booking ID: ${data.bookingId}</li>
        <li>Vehicle: ${data.vehicleName}</li>
        <li>Start Date: ${data.startDate}</li>
        <li>End Date: ${data.endDate}</li>
        <li>Amount Paid: ${data.amount}</li>
        <li>Payment ID: ${data.paymentId}</li>
      </ul>

      <p>Thank you for choosing OnnRides! We hope you enjoy your ride.</p>
      
      <p>If you have any questions, please contact our support team:</p>
      <ul>
        <li>Email: support@onnrides.com</li>
        <li>Phone: +91 8247494622</li>
      </ul>
    `;
    await this.sendEmail(to, { subject, template: 'booking_confirmation', data });
  }

  public async sendPaymentFailure(
    to: string,
    data: PaymentFailureData
  ): Promise<void> {
    const subject = 'Payment Failed - OnnRides';
    const html = `
      <h2>Payment Failed</h2>
      <p>Hello ${data.userName},</p>
      <p>We noticed that your payment of ${data.amount} for booking ID: ${data.bookingId} was not successful.</p>
      
      <h3>Payment Details:</h3>
      <ul>
        <li>Order ID: ${data.orderId}</li>
        <li>Payment ID: ${data.paymentId}</li>
        <li>Amount: ${data.amount}</li>
      </ul>

      <p>Please contact our support team for assistance:</p>
      <ul>
        <li>Email: ${data.supportEmail}</li>
        <li>Phone: ${data.supportPhone}</li>
      </ul>

      <p>Our support team will help you complete the payment or resolve any issues.</p>
      <p>Please have your booking ID and payment details ready when contacting support.</p>
    `;
    await this.sendEmail(to, { subject, template: 'payment_failure', data });
  }

  public async sendDocumentUploadReminder(
    to: string,
    data: DocumentUploadReminderData
  ): Promise<void> {
    const subject = 'Document Upload Required - OnnRides';
    const content = {
      subject,
      template: 'document_upload_reminder',
      data: {
        ...data,
        deadline: data.deadline || '24 hours',
        supportEmail: data.supportEmail || 'support@onnrides.com'
      }
    };

    try {
      await this.sendEmail(to, content, 1); // Higher priority for document reminders
      logger.info('Document upload reminder sent:', {
        recipient: to,
        bookingId: data.bookingId
      });
    } catch (error) {
      logger.error('Failed to send document upload reminder:', {
        error,
        recipient: to,
        bookingId: data.bookingId
      });
      throw error;
    }
  }
}

// Initialize the service
EmailService.getInstance(); 