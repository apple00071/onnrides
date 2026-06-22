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
      const provider = process.env.WHATSAPP_PROVIDER || (process.env.OPENWA_API_KEY ? 'openwa' : 'wasender');

      if (provider === 'openwa') {
        const apiKey = process.env.OPENWA_API_KEY;
        if (!apiKey) {
          logger.warn('OpenWA API Key not configured.');
          return;
        }
        this.isInitialized = true;
        logger.info('OpenWA WhatsApp service initialized successfully');
        return;
      }

      // Fallback/legacy WaSender
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
          enabled: false,
          maxRetries: 0
        },
        webhookSecret
      );

      this.isInitialized = true;
      logger.info('WaSender service initialized successfully');
    } catch (error) {
      logger.error('Error initializing WhatsApp service:', error);
    }
  }

  private static lastSendTime: number = 0;
  private static sendLock: Promise<any> = Promise.resolve();
  private static readonly MIN_SEND_GAP = 5500; // 5.5 seconds gap

  public async sendTextMessage(to: string, text: string): Promise<boolean> {
    if (!this.isInitialized) {
      logger.error('WhatsApp service not initialized');
      return false;
    }

    const provider = process.env.WHATSAPP_PROVIDER || (process.env.OPENWA_API_KEY ? 'openwa' : 'wasender');

    // Use a static lock to ensure messages are sent sequentially across all instances
    return WaSenderService.sendLock = WaSenderService.sendLock.then(async () => {
      try {
        // Calculate delay needed to respect the 5s rate limit
        const now = Date.now();
        const timeSinceLastSend = now - WaSenderService.lastSendTime;
        const delayNeeded = Math.max(0, WaSenderService.MIN_SEND_GAP - timeSinceLastSend);

        if (delayNeeded > 0) {
          logger.info(`Throttling WhatsApp send: waiting ${delayNeeded}ms before next message...`);
          await new Promise(resolve => setTimeout(resolve, delayNeeded));
        }

        // Format phone number - ensure it starts with country code
        const formattedPhone = this.formatPhoneNumber(to);

        if (!formattedPhone || formattedPhone.length < 10) {
          logger.warn(`Skipping WhatsApp send: Phone number "${to}" (formatted: "${formattedPhone}") is invalid or too short.`);
          return false;
        }

        if (provider === 'openwa') {
          const apiUrl = process.env.OPENWA_API_URL || 'http://localhost:2785';
          const sessionId = process.env.OPENWA_SESSION_ID || 'default';
          const apiKey = process.env.OPENWA_API_KEY || '';

          const response = await fetch(`${apiUrl}/api/sessions/${sessionId}/messages/send-text`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': apiKey,
              'api-key': apiKey
            },
            body: JSON.stringify({
              chatId: `${formattedPhone}@c.us`,
              text: text
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenWA send-text failed with status ${response.status}: ${errorText}`);
          }

          const result = await response.json();
          WaSenderService.lastSendTime = Date.now();

          logger.info('WhatsApp message sent successfully via OpenWA:', {
            to: formattedPhone,
            result
          });

          return true;
        } else {
          const textPayload: TextOnlyMessage = {
            messageType: "text",
            to: formattedPhone,
            text: text,
          };

          const result = await this.wasender.send(textPayload);
          WaSenderService.lastSendTime = Date.now();

          logger.info('WhatsApp message sent successfully via WaSender:', {
            to: formattedPhone,
            messageId: result.response?.message?.id,
            rateLimit: result.rateLimit
          });

          return true;
        }
      } catch (error) {
        if (provider === 'wasender' && error instanceof WasenderAPIError) {
          logger.error('WaSender API Error:', {
            statusCode: error.statusCode,
            message: error.apiMessage,
            details: error.errorDetails,
            rateLimit: error.rateLimit
          });
        } else {
          logger.error(`Error sending WhatsApp message via ${provider}:`, error);
        }
        return false;
      }
    });
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
    let cleaned = phone.replace(/\D/g, '');

    // Remove leading zeros
    cleaned = cleaned.replace(/^0+/, '');

    // If it's a 10-digit number, prefix with 91
    if (cleaned.length === 10) {
      return '91' + cleaned;
    }

    // If it's 12 digits and starts with 91, return as is
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned;
    }

    // For other cases, return as is (assuming valid format)
    return cleaned;
  }

  private createBookingConfirmationMessage(data: BookingConfirmationData): string {
    return `🎉 *Booking Confirmed!*

Dear ${data.customerName},

Your booking has been confirmed with *Mister Rides*.

📋 *Booking Details:*
• Booking ID: ${data.bookingId}
• Vehicle: ${data.vehicleModel}
• Start: ${data.startDate}
• End: ${data.endDate}
• Amount: ₹${data.totalAmount}

Need help? Contact us at:
📞 +91 9182495481
📧 support@misterrides.com

Thank you for choosing Mister Rides! 🙏`;
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
📧 support@misterrides.com

Thank you for choosing Mister Rides! 🙏`;
  }

  public async getSessionStatus(): Promise<any> {
    if (!this.isInitialized) {
      logger.error('WhatsApp service not initialized');
      return null;
    }

    const provider = process.env.WHATSAPP_PROVIDER || (process.env.OPENWA_API_KEY ? 'openwa' : 'wasender');

    if (provider === 'openwa') {
      try {
        const apiUrl = process.env.OPENWA_API_URL || 'http://localhost:2785';
        const sessionId = process.env.OPENWA_SESSION_ID || 'default';
        const apiKey = process.env.OPENWA_API_KEY || '';

        // Helper function to normalize status strings
        const normalizeStatus = (statusStr: string): string => {
          if (!statusStr) return 'DISCONNECTED';
          const upper = statusStr.toUpperCase();
          if (upper === 'READY' || upper === 'CONNECTED') return 'CONNECTED';
          return upper;
        };

        // Try getting session status directly
        const res = await fetch(`${apiUrl}/api/sessions/${sessionId}/status`, {
          headers: {
            'X-API-Key': apiKey,
            'api-key': apiKey
          }
        });

        if (res.ok) {
          const data = await res.json();
          const rawStatus = data.status || (data.data && data.data.status) || 'unknown';
          return {
            status: normalizeStatus(rawStatus),
            provider: 'openwa',
            raw: data
          };
        }

        // Fallback: details
        const detailsRes = await fetch(`${apiUrl}/api/sessions/${sessionId}`, {
          headers: {
            'X-API-Key': apiKey,
            'api-key': apiKey
          }
        });

        if (detailsRes.ok) {
          const data = await detailsRes.json();
          const rawStatus = data.status || (data.data && data.data.status) || (data.authenticated ? 'CONNECTED' : 'DISCONNECTED');
          return {
            status: normalizeStatus(rawStatus),
            provider: 'openwa',
            raw: data
          };
        }

        // Fallback 2: all sessions
        const allRes = await fetch(`${apiUrl}/api/sessions`, {
          headers: {
            'X-API-Key': apiKey,
            'api-key': apiKey
          }
        });

        if (allRes.ok) {
          const data = await allRes.json();
          const sessions = Array.isArray(data) ? data : (data.data || []);
          const ourSession = sessions.find((s: any) => s.session === sessionId || s.id === sessionId);
          if (ourSession) {
            const rawStatus = ourSession.status || (ourSession.authenticated ? 'CONNECTED' : 'DISCONNECTED');
            return {
              status: normalizeStatus(rawStatus),
              provider: 'openwa',
              raw: ourSession
            };
          }
        }

        return {
          status: 'DISCONNECTED',
          error: `Failed to fetch session. Status: ${res.status}`,
          provider: 'openwa'
        };
      } catch (error) {
        logger.error('Error getting OpenWA session status:', error);
        return {
          status: 'DISCONNECTED',
          error: error instanceof Error ? error.message : 'Unknown error',
          provider: 'openwa'
        };
      }
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
