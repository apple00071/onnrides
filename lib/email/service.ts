import nodemailer from 'nodemailer';
import logger from '../logger';
import { query } from '../db';

interface EmailLog {
  recipient: string;
  subject: string;
  message_content: string;
  booking_id?: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
  message_id?: string;
}

export class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter;

  private constructor() {
    // Log email configuration (excluding sensitive data)
    logger.info('Initializing email service with config:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      hasPassword: !!process.env.SMTP_PASS
    });

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true, // Use SSL/TLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS?.replace(/\s+/g, '') // Remove any whitespace from password
      },
    });
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
         VALUES ($1, $2, $3, $4, $5, $6, $7)
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

  public async sendEmail(
    to: string,
    subject: string,
    html: string,
    bookingId?: string
  ): Promise<void> {
    let logId: string | undefined;
    let retries = 3;

    while (retries > 0) {
      try {
        // Log the pending email if first attempt
        if (!logId) {
          logId = await this.logEmail({
            recipient: to,
            subject,
            message_content: html,
            booking_id: bookingId,
            status: 'pending'
          });
        }

        // Verify transporter connection
        await this.transporter.verify();

        const mailOptions = {
          from: process.env.SMTP_FROM || 'support@onnrides.com',
          to,
          subject,
          html,
        };

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

        return; // Success, exit the retry loop
      } catch (error) {
        retries--;
        logger.error(`Failed to send email (${retries} retries left):`, {
          error,
          to,
          subject,
          bookingId
        });

        if (retries === 0) {
          // Update log with final error
          if (logId) {
            await this.updateEmailLog(logId, {
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
          throw error;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));

        // If connection error, recreate transporter
        if (error instanceof Error && 
            (error.message.includes('connection') || error.message.includes('authentication'))) {
          this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            },
          });
        }
      }
    }
  }

  public async sendPaymentConfirmation(
    to: string,
    userName: string,
    amount: string,
    bookingId: string
  ): Promise<void> {
    const subject = 'Payment Confirmation - OnnRides';
    const html = `
      <h2>Payment Confirmation</h2>
      <p>Hello ${userName},</p>
      <p>Your payment of Rs. ${amount} for booking ID: ${bookingId} has been received.</p>
      <p>Thank you for choosing OnnRides!</p>
    `;
    await this.sendEmail(to, subject, html, bookingId);
  }

  public async sendPaymentFailure(
    to: string,
    userName: string,
    amount: string,
    bookingId: string,
    orderId: string
  ): Promise<void> {
    const subject = 'Payment Failed - OnnRides';
    const html = `
      <h2>Payment Failed</h2>
      <p>Hello ${userName},</p>
      <p>We noticed that your payment of Rs. ${amount} for booking ID: ${bookingId} was not successful.</p>
      <p>Order ID: ${orderId}</p>
      <p>Please try again or contact our support if you need assistance.</p>
      <p>Support: support@onnrides.com</p>
    `;
    await this.sendEmail(to, subject, html, bookingId);
  }
} 