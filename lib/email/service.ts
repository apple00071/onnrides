import nodemailer, { Transporter } from 'nodemailer';
import logger from '../logger';
import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';

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

interface PasswordResetData {
  name: string;
  resetLink: string;
  supportEmail: string;
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
  private initializationError: Error | null = null;

  private constructor() {
    this.initializationPromise = this.initialize();
  }

  private async initialize() {
    try {
      // Validate required environment variables
      const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}`;
        logger.error(errorMsg);
        this.initializationError = new Error(errorMsg);
        throw this.initializationError;
      }

      // Log all environment variables with partially masked values for debugging
      logger.info('Email service environment variables:', {
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_USER: process.env.SMTP_USER?.substring(0, 3) + '...',
        SMTP_PASS: process.env.SMTP_PASS ? '******' : 'not set',
        SMTP_FROM: process.env.SMTP_FROM
      });

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
      try {
        await this.transporter.verify();
        logger.info('Email service SMTP connection verified successfully');
      } catch (verifyError) {
        logger.error('SMTP connection verification failed:', verifyError);
        this.initializationError = verifyError instanceof Error ? verifyError : new Error('SMTP verification failed');
        throw this.initializationError;
      }
      
      logger.info('Email service initialized successfully', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER?.substring(0, 3) + '...'
      });

      this.initialized = true;
    } catch (error) {
      this.initialized = false;
      this.initializationError = error instanceof Error ? error : new Error('Unknown error initializing email service');
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

  public getInitializationStatus(): { initialized: boolean; error: Error | null } {
    return { 
      initialized: this.initialized,
      error: this.initializationError
    };
  }

  private async waitForInitialization(): Promise<void> {
    if (!this.initialized) {
      try {
        await this.initializationPromise;
      } catch (error) {
        logger.error('Email service initialization failed during wait:', error);
        throw error;
      }
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

  private async logEmail(
    recipient: string,
    subject: string,
    message: string,
    status: string = 'pending',
    bookingId?: string | null
  ): Promise<string> {
    try {
      // Generate a proper UUID for the log entry
      const logId = uuidv4();

      const result = await query(
        `
        INSERT INTO email_logs (
            id, recipient, subject, message_content, 
            booking_id, status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
        `,
        [logId, recipient, subject, message, bookingId, status]
      );

      logger.info('Email log created:', {
        logId: result.rows[0].id,
        recipient,
        status
      });

      return result.rows[0].id;
    } catch (error) {
      logger.error('Failed to log email:', {
        error,
        recipient,
        subject,
        status,
        bookingId
      });
      throw error;
    }
  }

  private async updateEmailLog(
    id: string,
    updates: { status: string; message_id?: string; error?: string }
  ): Promise<void> {
    try {
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        throw new Error(`Invalid UUID format for email log ID: ${id}`);
      }

      const updateFields = [];
      const values = [id];
      let paramCount = 2;

      if (updates.status) {
        updateFields.push(`status = $${paramCount}`);
        values.push(updates.status);
        paramCount++;
      }

      if (updates.message_id) {
        updateFields.push(`message_id = $${paramCount}`);
        values.push(updates.message_id);
        paramCount++;
      }

      if (updates.error) {
        updateFields.push(`error = $${paramCount}`);
        values.push(updates.error);
        paramCount++;
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      const sql = `
        UPDATE email_logs 
        SET ${updateFields.join(', ')}
        WHERE id = $1
      `;

      await query(sql, values);

      logger.info('Email log updated:', {
        logId: id,
        updates
      });
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

  public async sendPasswordResetEmail(
    to: string,
    data: PasswordResetData
  ): Promise<void> {
    const subject = 'Password Reset - OnnRides';
    const content = {
      subject,
      template: 'password_reset',
      data: {
        ...data,
        supportEmail: data.supportEmail || 'support@onnrides.com'
      }
    };

    try {
      await this.sendEmail(to, content.subject, this.getEmailTemplate(content.template, content.data));
      logger.info('Password reset email sent:', {
        recipient: to
      });
    } catch (error) {
      logger.error('Failed to send password reset email:', {
        error,
        recipient: to
      });
      throw error;
    }
  }

  private getEmailTemplate(template: string, data: Record<string, any>): string {
    switch (template) {
      case 'password_reset':
        return `
          <h2>Hello ${data.name},</h2>
          <p>We received a request to reset your password for your OnnRides account.</p>
          <p>Click the link below to reset your password:</p>
          <p><a href="${data.resetLink}">${data.resetLink}</a></p>
          <p>This link will expire in 1 hour for security reasons.</p>
          <p>If you didn't request this password reset, please ignore this email or contact us at ${data.supportEmail} if you have concerns.</p>
          <p>Best regards,<br>OnnRides Team</p>
        `;

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