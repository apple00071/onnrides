import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import logger from './logger';
import { query } from './db';

interface WhatsAppStatus {
  isInitialized: boolean;
  error?: Error;
}

export class WhatsAppService {
  private static instance: WhatsAppService;
  private client: Client;
  private status: WhatsAppStatus = {
    isInitialized: false
  };

  private constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    this.initializeClient();
  }

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  private async initializeClient() {
    try {
      this.client.on('qr', (qr) => {
        qrcode.toFile('./whatsapp-qr.png', qr);
        logger.info('New QR code generated');
      });

      this.client.on('ready', () => {
        this.status.isInitialized = true;
        logger.info('WhatsApp client is ready');
      });

      this.client.on('disconnected', () => {
        this.status.isInitialized = false;
        logger.warn('WhatsApp client disconnected');
      });

      await this.client.initialize();
    } catch (error) {
      this.status.error = error instanceof Error ? error : new Error('Unknown error during initialization');
      logger.error('WhatsApp initialization error:', error);
    }
  }

  public getInitializationStatus(): WhatsAppStatus {
    return this.status;
  }

  public async sendMessage(to: string, message: string, bookingId?: string): Promise<boolean> {
    try {
      if (!this.status.isInitialized) {
        throw new Error('WhatsApp client not initialized');
      }

      // Format phone number
      const formattedNumber = this.formatPhoneNumber(to);
      
      // Send message
      const response = await this.client.sendMessage(`${formattedNumber}@c.us`, message);
      
      // Log success
      logger.info('WhatsApp message sent successfully', {
        to: formattedNumber,
        bookingId,
        messageId: response.id._serialized
      });

      return true;
    } catch (error) {
      logger.error('Failed to send WhatsApp message:', error);
      throw error;
    }
  }

  public async sendBookingConfirmation(
    phone: string,
    userName: string,
    vehicleDetails: string,
    bookingDate: string,
    bookingId?: string
  ): Promise<boolean> {
    const message = `Hello ${userName}! 👋\n\nYour booking is confirmed! 🎉\n\n` +
      `Vehicle: ${vehicleDetails}\n` +
      `Date: ${bookingDate}\n` +
      `Booking ID: ${bookingId || 'N/A'}\n\n` +
      `Thank you for choosing our service! 🙏`;

    return this.sendMessage(phone, message, bookingId);
  }

  public async sendPaymentConfirmation(
    phone: string,
    userName: string,
    amount: string,
    bookingId: string
  ): Promise<boolean> {
    const message = `Hello ${userName}! 👋\n\nYour payment of ${amount} has been received! ✅\n\n` +
      `Booking ID: ${bookingId}\n\n` +
      `Thank you for your payment! 🙏`;

    return this.sendMessage(phone, message, bookingId);
  }

  public async sendBookingCancellation(
    phone: string,
    userName: string,
    vehicleDetails: string,
    bookingId?: string
  ): Promise<boolean> {
    const message = `Hello ${userName}! 👋\n\nYour booking has been cancelled.\n\n` +
      `Vehicle: ${vehicleDetails}\n` +
      `Booking ID: ${bookingId || 'N/A'}\n\n` +
      `We hope to serve you again soon! 🙏`;

    return this.sendMessage(phone, message, bookingId);
  }

  private formatPhoneNumber(phone: string): string {
    // Remove any non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Remove leading zeros or country code if present
    const number = cleaned.replace(/^(0|91|)/, '');
    
    // Add country code if not present
    return number.length === 10 ? `91${number}` : number;
  }
} 