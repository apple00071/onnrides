import { createWasender, TextOnlyMessage, WasenderAPIError } from 'wasenderapi';

// Simple logger for the service
const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${message}`, meta || '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${message}`, meta || '');
  },
  error: (message: string, meta?: any) => {
    console.error(`[ERROR] ${message}`, meta || '');
  }
};

interface BookingConfirmationData {
  customerName: string;
  customerPhone: string;
  vehicleType: string;
  vehicleModel: string;
  startDate: string;
  endDate: string;
  bookingId: string;
  totalAmount: string;
}

interface PaymentConfirmationData {
  customerName: string;
  customerPhone: string;
  bookingId: string;
  amount: string;
  paymentId: string;
}

export class WaSenderService {
  private static instance: WaSenderService;
  private wasender: any;
  private isInitialized: boolean = false;

  private constructor() {
    this.initializeWaSender();
  }

  public static getInstance(): WaSenderService {
    if (!WaSenderService.instance) {
      WaSenderService.instance = new WaSenderService();
    }
    return WaSenderService.instance;
  }

  private initializeWaSender(): void {
    try {
      const apiKey = process.env.WASENDER_API_KEY;
      const personalAccessToken = process.env.WASENDER_PERSONAL_ACCESS_TOKEN;
      const webhookSecret = process.env.WASENDER_WEBHOOK_SECRET;

      if (!apiKey && !personalAccessToken) {
        logger.warn('WaSender API credentials not configured. At least one of WASENDER_API_KEY or WASENDER_PERSONAL_ACCESS_TOKEN is required.');
        return;
      }

      this.wasender = createWasender(
        apiKey,
        personalAccessToken,
        undefined, // Use default base URL
        undefined, // Use default fetch implementation
        {
          enabled: true,
          maxRetries: 3
        },
        webhookSecret
      );

      this.isInitialized = true;
      logger.info('WaSender service initialized successfully');
    } catch (error) {
      logger.error('Error initializing WaSender service:', error);
    }
  }

  public async sendTextMessage(to: string, text: string): Promise<boolean> {
    if (!this.isInitialized) {
      logger.error('WaSender service not initialized');
      return false;
    }

    try {
      // Format phone number - ensure it starts with country code
      const formattedPhone = this.formatPhoneNumber(to);
      
      const textPayload: TextOnlyMessage = {
        messageType: "text",
        to: formattedPhone,
        text: text,
      };

      const result = await this.wasender.send(textPayload);
      
      logger.info('WhatsApp message sent successfully via WaSender:', {
        to: formattedPhone,
        messageId: result.response?.message?.id,
        rateLimit: result.rateLimit
      });

      return true;
    } catch (error) {
      if (error instanceof WasenderAPIError) {
        logger.error('WaSender API Error:', {
          statusCode: error.statusCode,
          message: error.apiMessage,
          details: error.errorDetails,
          rateLimit: error.rateLimit
        });
      } else {
        logger.error('Error sending WhatsApp message via WaSender:', error);
      }
      return false;
    }
  }

  public async sendBookingConfirmation(data: BookingConfirmationData): Promise<boolean> {
    const message = this.createBookingConfirmationMessage(data);
    return this.sendTextMessage(data.customerPhone, message);
  }

  public async sendPaymentConfirmation(data: PaymentConfirmationData): Promise<boolean> {
    const message = this.createPaymentConfirmationMessage(data);
    return this.sendTextMessage(data.customerPhone, message);
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If it starts with 91 (India country code), keep as is
    if (cleaned.startsWith('91')) {
      return cleaned;
    }
    
    // If it's a 10-digit number, assume it's Indian and add country code
    if (cleaned.length === 10) {
      return '91' + cleaned;
    }
    
    // Return as is for other formats
    return cleaned;
  }

  private createBookingConfirmationMessage(data: BookingConfirmationData): string {
    return `🎉 *Booking Confirmed!*

Dear ${data.customerName},

Your booking has been confirmed with *OnnRides*.

📋 *Booking Details:*
• Booking ID: ${data.bookingId}
• Vehicle: ${data.vehicleModel}
• Start: ${data.startDate}
• End: ${data.endDate}
• Amount: ₹${data.totalAmount}

Need help? Contact us at:
📞 +91 9182495481
📧 support@onnrides.com

Thank you for choosing OnnRides! 🙏`;
  }

  private createPaymentConfirmationMessage(data: PaymentConfirmationData): string {
    return `💳 *Payment Confirmed!*

Dear ${data.customerName},

Your payment has been successfully processed.

💰 *Payment Details:*
• Booking ID: ${data.bookingId}
• Amount Paid: ₹${data.amount}
• Payment ID: ${data.paymentId}
• Status: ✅ Confirmed

Your booking is now confirmed and ready!

Need help? Contact us at:
📞 +91 9182495481
📧 support@onnrides.com

Thank you for choosing OnnRides! 🙏`;
  }

  public async getSessionStatus(): Promise<any> {
    if (!this.isInitialized) {
      logger.error('WaSender service not initialized');
      return null;
    }

    try {
      const sessions = await this.wasender.getAllWhatsAppSessions();
      return sessions;
    } catch (error) {
      logger.error('Error getting session status:', error);
      return null;
    }
  }
}
