import { EmailService } from '@/lib/email/service';
import { WaSenderService } from '@/lib/whatsapp/wasender-service';
import logger from '@/lib/logger';
import { formatCurrency } from '@/lib/utils/currency-formatter';
import { formatIST } from '@/lib/utils/time-formatter';
import { query } from '@/lib/db';  // Import the direct SQL query function

// Maximum number of consecutive failures before we start logging warnings
const MAX_FAILURE_THRESHOLD = 5;

// Define admin notification recipients
export const ADMIN_EMAILS = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];
export const ADMIN_PHONES = process.env.ADMIN_PHONES ? process.env.ADMIN_PHONES.split(',') : [];
export const DEFAULT_ADMIN_EMAILS = ['contact@onnrides.com', 'onnrides@gmail.com'];
export const DEFAULT_ADMIN_PHONES = ['8247494622', '9182495481', '8309031203'];

// Helper function to format date in IST
export function formatDateIST(date: Date | string): string {
  return formatIST(date);
}

// Interface for notification data
export interface AdminNotificationData {
  type: 'booking' | 'payment' | 'document' | 'account' | 'system' | 'test';
  title: string;
  message: string;
  data?: Record<string, any>;
}

/**
 * Class to handle admin notifications
 */
export class AdminNotificationService {
  private static instance: AdminNotificationService;
  private emailService: EmailService;
  private waSenderService: WaSenderService;
  private notificationQueue: AdminNotificationData[] = [];
  private isProcessing = false;
  private emailFailureCount = 0;
  private whatsappFailureCount = 0;
  private static tableExists: boolean | null = null;

  private constructor() {
    this.emailService = EmailService.getInstance();
    this.waSenderService = WaSenderService.getInstance();

    // Log configuration on initialization
    logger.info('AdminNotificationService initialized with:', {
      adminEmails: this.getAdminEmails().length > 0 ?
        this.getAdminEmails() : 'None configured',
      adminPhones: this.getAdminPhones().length > 0 ?
        'Configured' : 'None configured',
    });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AdminNotificationService {
    if (!AdminNotificationService.instance) {
      AdminNotificationService.instance = new AdminNotificationService();
    }
    return AdminNotificationService.instance;
  }

  /**
   * Get admin emails, with fallback to defaults
   */
  private getAdminEmails(): string[] {
    return ADMIN_EMAILS.length > 0 ? ADMIN_EMAILS : DEFAULT_ADMIN_EMAILS;
  }

  /**
   * Get admin phones, with fallback to defaults
   */
  private getAdminPhones(): string[] {
    return ADMIN_PHONES.length > 0 ? ADMIN_PHONES : DEFAULT_ADMIN_PHONES;
  }

  /**
   * Send notification to admins with retry mechanism
   */
  public async sendNotification(data: AdminNotificationData): Promise<{
    success: boolean;
    emailsSent: string[];
    whatsappSent: string[];
    errors?: string[];
  }> {
    try {
      // Add to queue if already processing
      if (this.isProcessing) {
        this.notificationQueue.push(data);
        logger.info('Added notification to queue', { type: data.type, title: data.title });
        return {
          success: true,
          emailsSent: [],
          whatsappSent: [],
          errors: ['Added to queue for processing']
        };
      }

      this.isProcessing = true;
      const adminEmails = this.getAdminEmails();
      const adminPhones = this.getAdminPhones();

      // Log attempt
      logger.info('Sending admin notification', {
        type: data.type,
        title: data.title,
        recipientCount: {
          emails: adminEmails.length,
          phones: adminPhones.length
        }
      });

      // Create HTML content
      const htmlContent = this.createHtmlContent(data);
      const textContent = this.createTextContent(data);

      const errors: string[] = [];
      const emailsSent: string[] = [];
      const whatsappSent: string[] = [];

      // Send emails with individual try/catch to allow partial success
      const emailPromises = adminEmails.map(async (email) => {
        try {
          if (!email || !email.trim()) return;

          // Send with timeout to prevent hanging the whole flow
          const emailPromise = this.emailService.sendEmail(
            email.trim(),
            data.title,
            htmlContent
          );

          // Add a 10s timeout
          const emailResult = await Promise.race([
            emailPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Email timeout after 10s')), 10000))
          ]) as any;

          emailsSent.push(email);
          logger.info(`Admin email sent to ${email}`, {
            messageId: emailResult.messageId,
            logId: emailResult.logId
          });

          // Save a DB record for the admin notification using direct SQL if table exists
          try {
            if (AdminNotificationService.tableExists === null) {
              try {
                const tableCheck = await query(`
                  SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'AdminNotification'
                  );
                `);
                AdminNotificationService.tableExists = tableCheck.rows[0].exists;
              } catch (e) {
                AdminNotificationService.tableExists = false;
                logger.warn('AdminNotification table check failed, assuming false');
              }
            }

            if (AdminNotificationService.tableExists) {
              await query(`
                INSERT INTO "AdminNotification" (
                  id, type, title, message, recipient, channel, status, data, created_at, updated_at
                ) VALUES (
                  gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
                )
              `, [
                data.type,
                data.title,
                data.message,
                email,
                'email',
                'success',
                data.data ? JSON.stringify(data.data) : null
              ]);
            }
          } catch (dbError) {
            logger.error('Failed to save admin notification to database:', dbError);
          }

          this.emailFailureCount = 0; // Reset counter on success
        } catch (error) {
          this.emailFailureCount++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`Failed to send admin email to ${email}:`, { error: errorMessage, type: data.type });
          errors.push(`Email to ${email} failed: ${errorMessage}`);

          // Save failed notification record using direct SQL
          try {
            if (AdminNotificationService.tableExists !== false) {
              await query(`
                INSERT INTO "AdminNotification" (
                  id, type, title, message, recipient, channel, status, error, data, created_at, updated_at
                ) VALUES (
                  gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
                )
              `, [
                data.type,
                data.title,
                data.message,
                email,
                'email',
                'failed',
                error instanceof Error ? error.message : String(error),
                data.data ? JSON.stringify(data.data) : null
              ]);
            }
          } catch (logError: any) {
            if (logError?.code === '42P01') {
              AdminNotificationService.tableExists = false;
            } else {
              logger.error('Failed to log email notification failure:', logError);
            }
          }
        }
      });

      // 1. Define helper to send to a single phone
      const sendToPhone = async (phone: string) => {
        try {
          if (!phone || !phone.trim()) return false;

          // Send a generic text message through the WhatsApp service
          // This will be automatically throttled by the WaSenderService
          const success = await this.waSenderService.sendTextMessage(phone.trim(), textContent);

          if (!success) {
            throw new Error('WaSender service returned false');
          }

          whatsappSent.push(phone);
          logger.info(`Admin WhatsApp sent to ${phone}`);

          // Save a DB record
          try {
            if (AdminNotificationService.tableExists !== false) {
              await query(`
                INSERT INTO "AdminNotification" (
                  id, type, title, message, recipient, channel, status, data, created_at, updated_at
                ) VALUES (
                  gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
                )
              `, [
                data.type,
                data.title,
                textContent,
                phone,
                'whatsapp',
                'sent',
                JSON.stringify(data.data || {})
              ]);
            }
          } catch (dbError: any) {
            if (dbError?.code === '42P01') {
              AdminNotificationService.tableExists = false;
            } else {
              logger.error('Error saving WhatsApp notification to database:', dbError);
            }
          }
          return true;
        } catch (whatsappError: any) {
          errors.push(`Failed to send WhatsApp to ${phone}: ${whatsappError?.message || 'Unknown error'}`);
          logger.error(`Failed to send WhatsApp to admin ${phone}:`, whatsappError);
          this.whatsappFailureCount++;
          return false;
        }
      };

      // 2. Send to all admin phones sequentially
      for (const phone of adminPhones) {
        await sendToPhone(phone);
      }

      const success = emailsSent.length > 0 || whatsappSent.length > 0;

      // Process queue if any
      this.isProcessing = false;
      this.processQueue();

      // Alert about persistent failures
      if (this.emailFailureCount >= 3) {
        logger.warn(`Multiple admin email failures detected (${this.emailFailureCount}). Check SMTP configuration.`);
      }

      if (this.whatsappFailureCount >= 3) {
        logger.warn(`Multiple admin WhatsApp failures detected (${this.whatsappFailureCount}). Check WhatsApp API.`);
      }

      // Return results
      return {
        success,
        emailsSent,
        whatsappSent,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      logger.error('Error in AdminNotificationService:', error);
      this.isProcessing = false;
      return {
        success: false,
        emailsSent: [],
        whatsappSent: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Process queued notifications
   */
  private async processQueue() {
    if (this.notificationQueue.length === 0 || this.isProcessing) {
      return;
    }

    const nextNotification = this.notificationQueue.shift();
    if (nextNotification) {
      await this.sendNotification(nextNotification);
    }
  }

  /**
   * Create HTML content for notification
   */
  private createHtmlContent(data: AdminNotificationData): string {
    let detailsHtml = '';

    if (data.data) {
      detailsHtml = '<h2>Details:</h2><ul>';

      for (const [key, value] of Object.entries(data.data)) {
        const formattedKey = key.replace(/_/g, ' ').replace(/^\w|\s\w/g, c => c.toUpperCase());

        let formattedValue = value;

        // Format dates
        if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
          formattedValue = formatDateIST(value);
        }

        // Format prices/currency values
        if (key.includes('price') || key.includes('amount') || key.includes('cost')) {
          if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) {
            formattedValue = formatCurrency(Number(value));
          }
        }

        detailsHtml += `<li><strong>${formattedKey}:</strong> ${formattedValue}</li>`;
      }

      detailsHtml += '</ul>';
    }

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 5px;">
        <h1 style="color: #f26e24;">${data.title}</h1>
        <p>${data.message}</p>
        
        ${detailsHtml}
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>This is an automated notification from OnnRides.</p>
          <p>Sent at: ${formatDateIST(new Date())}</p>
        </div>
      </div>
    `;
  }

  /**
   * Create text content for WhatsApp
   */
  private createTextContent(data: AdminNotificationData): string {
    let detailsText = '';

    if (data.data) {
      detailsText = '\n\n';

      for (const [key, value] of Object.entries(data.data)) {
        const formattedKey = key.replace(/_/g, ' ').replace(/^\w|\s\w/g, c => c.toUpperCase());

        let formattedValue = value;

        // Format dates
        if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
          formattedValue = formatDateIST(value);
        }

        // Format prices/currency values
        if (key.includes('price') || key.includes('amount') || key.includes('cost')) {
          if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) {
            formattedValue = formatCurrency(Number(value));
          }
        }

        detailsText += `${formattedKey}: ${formattedValue}\n`;
      }
    }

    return `*${data.title}*\n\n${data.message}${detailsText}`;
  }

  /**
   * Send new booking notification
   */
  public async sendBookingNotification(bookingData: {
    booking_id: string;
    pickup_location: string;
    user_name: string;
    user_phone: string;
    vehicle_name: string;
    start_date: Date;
    end_date: Date;
    total_price: number;
    advance_paid: number;
  }): Promise<{
    success: boolean;
    emailsSent: string[];
    whatsappSent: string[];
    errors?: string[];
  }> {
    return this.sendNotification({
      type: 'booking',
      title: 'New Booking Received!',
      message: 'A new booking has been received.',
      data: {
        'Booking Id': bookingData.booking_id,
        'Pickup Location': bookingData.pickup_location,
        'Customer Name': bookingData.user_name,
        'Customer Phone': bookingData.user_phone,
        'Vehicle Name': bookingData.vehicle_name,
        'Start Date': bookingData.start_date,
        'End Date': bookingData.end_date,
        'Total Booking Value': bookingData.total_price,
        'Advance Received (Online)': bookingData.advance_paid
      }
    });
  }

  /**
   * Send consolidated booking & payment success notification
   */
  public async sendBookingSuccessNotification(bookingData: {
    booking_id: string;
    pickup_location: string;
    user_name: string;
    user_phone: string;
    vehicle_name: string;
    start_date: Date;
    end_date: Date;
    total_price: number;
    advance_paid: number;
    payment_id: string;
  }): Promise<{
    success: boolean;
    emailsSent: string[];
    whatsappSent: string[];
    errors?: string[];
  }> {
    return this.sendNotification({
      type: 'booking',
      title: '🎉 New Booking & Payment Received!',
      message: `A new booking ${bookingData.booking_id} has been confirmed with a payment of ${formatCurrency(bookingData.advance_paid)}.`,
      data: {
        booking_id: bookingData.booking_id,
        vehicle: bookingData.vehicle_name,
        customer: bookingData.user_name,
        phone: bookingData.user_phone,
        pickup: bookingData.pickup_location,
        start: bookingData.start_date,
        end: bookingData.end_date,
        total_price: bookingData.total_price,
        advance_paid: bookingData.advance_paid,
        payment_id: bookingData.payment_id
      }
    });
  }

  /**
   * Send payment confirmation notification
   */
  public async sendPaymentNotification(paymentData: {
    booking_id: string;
    payment_id: string;
    user_name: string;
    amount: number;
    payment_method: string;
    status: string;
    transaction_time: Date;
  }): Promise<{
    success: boolean;
    emailsSent: string[];
    whatsappSent: string[];
    errors?: string[];
  }> {
    return this.sendNotification({
      type: 'payment',
      title: 'Payment Confirmation',
      message: `A payment of ${formatCurrency(paymentData.amount)} has been ${paymentData.status === 'success' ? 'received' : 'attempted'}.`,
      data: paymentData
    });
  }
}
