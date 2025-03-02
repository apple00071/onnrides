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
  private initializationPromise: Promise<void>;

  private constructor() {
    this.initializationPromise = this.initialize();
  }

  private async initialize() {
    try {
      // Validate required environment variables
      const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
      }

      // Create transporter with secure configuration
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: true
        }
      });

      // Verify connection
      await this.transporter.verify();
      
      logger.info('Email service initialized successfully', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER?.substring(0, 3) + '...'
      });

      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      throw error;
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
      await this.initializationPromise;
    }
  }

  async sendEmail(to: string, subject: string, html: string, bookingId?: string | null): Promise<{ messageId: string; logId: string }> {
    try {
      await this.waitForInitialization();

      // Validate email address
      if (!to || !to.includes('@')) {
        throw new Error('Invalid recipient email address');
      }

      const mailOptions = {
        from: process.env.SMTP_FROM,
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
          message_id: info.messageId
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

  private async logEmail(recipient: string, subject: string, message: string, status: string, bookingId?: string | null): Promise<string> {
    try {
      // Validate required fields
      if (!recipient || !subject || !message || !status) {
        throw new Error('Missing required fields for email log');
      }

      // Ensure status is one of the allowed values
      const validStatuses = ['pending', 'success', 'failed'];
      if (!validStatuses.includes(status)) {
        status = 'pending';
      }

      try {
        // First check if table exists and has correct columns
        try {
          await query('SELECT column_name FROM information_schema.columns WHERE table_name = $1', ['email_logs']);
          
          // Try inserting with basic columns only
          // Use a more flexible query that doesn't depend on exact column names
          const result = await query(
            `INSERT INTO email_logs 
             (recipient, subject, status, booking_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())
             RETURNING id::text`,
            [recipient, subject, status, bookingId]
          );
          
          if (!result.rows[0]?.id) {
            throw new Error('Failed to create email log - no ID returned');
          }
          
          return result.rows[0].id;
        } catch (schemaError) {
          logger.error('Error with email_logs table structure:', schemaError);
          
          // Attempt to create the table with the minimal required structure
          await query(`
            CREATE TABLE IF NOT EXISTS email_logs (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              recipient TEXT NOT NULL,
              subject TEXT NOT NULL,
              status TEXT NOT NULL,
              booking_id TEXT,
              created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
          `);
          
          // Try again with minimal fields
          const result = await query(
            `INSERT INTO email_logs 
             (recipient, subject, status, booking_id)
             VALUES ($1, $2, $3, $4)
             RETURNING id::text`,
            [recipient, subject, status, bookingId]
          );
          
          if (!result.rows[0]?.id) {
            throw new Error('Failed to create email log - no ID returned');
          }
          
          return result.rows[0].id;
        }
      } catch (insertError) {
        // Direct DB logging failed, log to console only
        logger.error('Failed to insert email log to database:', {
          error: insertError,
          recipient,
          subject,
          status,
          bookingId
        });
        
        // Return a fallback ID since we couldn't create a log record
        return `fallback-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      }
    } catch (error) {
      logger.error('Failed to log email:', {
        error,
        recipient,
        subject,
        status,
        bookingId
      });
      // Return a random ID since we couldn't create a proper log
      return `error-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }
  }

  private async updateEmailLog(id: string, updates: { status: string; message_id?: string; error?: string }) {
    try {
      const params: any[] = [];
      const updates_sql: string[] = [];
      
      if (updates.status) {
        params.push(updates.status);
        updates_sql.push(`status = $${params.length}`);
      }
      
      if (updates.message_id) {
        params.push(updates.message_id);
        updates_sql.push(`message_id = $${params.length}`);
      }
      
      if (updates.error) {
        params.push(updates.error);
        updates_sql.push(`error = $${params.length}`);
      }
      
      // Add updated_at
      updates_sql.push('updated_at = CURRENT_TIMESTAMP');
      
      // Add the id as the last parameter
      params.push(id);
      
      const sql = `
        UPDATE email_logs 
        SET ${updates_sql.join(', ')}
        WHERE id = $${params.length}
      `;

      await query(sql, params);
    } catch (error) {
      logger.error('Failed to update email log:', {
        error,
        id,
        updates
      });
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
    await this.sendEmail(to, subject, html, data.bookingId);
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