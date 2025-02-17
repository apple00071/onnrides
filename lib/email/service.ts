import nodemailer, { Transporter } from 'nodemailer';
import logger from '@/lib/logger';
import { query } from '@/lib/db';

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
  private transporter!: Transporter;
  private initialized: boolean = false;
  private initializationError: Error | null = null;

  private constructor() {
    this.initialize().catch(error => {
      logger.error('Failed to initialize email service:', error);
      this.initializationError = error;
    });
  }

  private async initialize() {
    try {
      // Create transporter with Gmail SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: true, // true for port 465
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5
      });

      // Verify connection configuration
      await this.transporter.verify();
      this.initialized = true;
      logger.info('Email service initialized successfully with Gmail SMTP');

      // Initialize database table
      await this.initializeDatabase();
    } catch (error) {
      this.initialized = false;
      this.initializationError = error instanceof Error ? error : new Error('Unknown error');
      throw error;
    }
  }

  private async initializeDatabase() {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS email_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          recipient TEXT NOT NULL,
          subject TEXT NOT NULL,
          message_content TEXT NOT NULL,
          status TEXT NOT NULL,
          error TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
        CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);
      `);
    } catch (error) {
      logger.error('Error initializing email database:', error);
      throw error;
    }
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private async logEmail(recipient: string, subject: string, message: string, status: string, error?: string): Promise<string> {
    try {
      const result = await query(
        `INSERT INTO email_logs (recipient, subject, message_content, status, error)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [recipient, subject, message, status, error]
      );
      return result.rows[0].id;
    } catch (error) {
      logger.error('Failed to log email:', error);
      throw error;
    }
  }

  async sendEmail(to: string, subject: string, html: string) {
    if (!this.initialized) {
      if (this.initializationError) {
        throw this.initializationError;
      }
      await this.initialize();
    }

    let logId: string | undefined;

    try {
      // Log the pending email
      logId = await this.logEmail(to, subject, html, 'pending');

      const result = await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        html,
        headers: {
          'X-Log-ID': logId
        }
      });

      // Update log with success
      await query(
        `UPDATE email_logs 
         SET status = 'sent', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [logId]
      );

      logger.info('Email sent successfully:', { logId, messageId: result.messageId });
      return { success: true, messageId: result.messageId, logId };

    } catch (error) {
      logger.error('Failed to send email:', error);

      if (logId) {
        await query(
          `UPDATE email_logs 
           SET status = 'failed', error = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [logId, error instanceof Error ? error.message : 'Unknown error']
        );
      }

      throw error;
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
    await this.sendEmail(to, subject, html);
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
    await this.sendEmail(to, subject, html);
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
      await this.sendEmail(to, content.subject, this.getEmailTemplate(content.template, content.data));
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
}

// Initialize the service
EmailService.getInstance(); 