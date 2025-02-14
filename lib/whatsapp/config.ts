import logger from '../logger';
import type { Client } from 'whatsapp-web.js';

const qrcodeTerminal = require('qrcode-terminal');
let whatsappClient: Client | null = null;

// Initialize WhatsApp client with local authentication
export async function initializeWhatsAppClient(): Promise<Client | null> {
  if (typeof process === 'undefined' || !process.versions || process.versions.node === undefined) {
    logger.warn('WhatsApp client cannot be initialized in browser environment');
    return null;
  }

  try {
    const { Client, LocalAuth } = await import('whatsapp-web.js');
    
    whatsappClient = new Client({
      authStrategy: new LocalAuth({
        clientId: 'onnrides-whatsapp-client',
        dataPath: './whatsapp-auth'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      },
      qrMaxRetries: 3,
      authTimeoutMs: 60000,
      restartOnAuthFail: true
    });

    return whatsappClient;
  } catch (error) {
    logger.error('Error importing WhatsApp dependencies:', error);
    return null;
  }
}

// Initialize WhatsApp client
export const initializeWhatsApp = async () => {
  if (typeof process === 'undefined' || !process.versions || process.versions.node === undefined) {
    logger.warn('WhatsApp initialization attempted in browser environment');
    return;
  }

  try {
    const client = await initializeWhatsAppClient();
    if (!client) {
      throw new Error('Failed to initialize WhatsApp client');
    }

    // Generate QR Code for authentication
    client.on('qr', async (qr: string) => {
      logger.info('WhatsApp QR Code generated. Please scan with your WhatsApp app.');
      try {
        qrcodeTerminal.generate(qr, { small: true });
      } catch (error) {
        logger.error('Error generating QR code:', error);
      }
    });

    // Handle successful authentication
    client.on('ready', () => {
      logger.info('WhatsApp client is ready!');
    });

    // Handle authentication failures
    client.on('auth_failure', (error: Error) => {
      logger.error('WhatsApp authentication failed:', error);
    });

    // Initialize the client
    await client.initialize();
  } catch (error) {
    logger.error('Error initializing WhatsApp client:', error);
    throw error;
  }
};

export const WHATSAPP_MESSAGE_TEMPLATES = {
  BOOKING_CONFIRMATION: (userName: string, vehicleDetails: string, bookingDate: string) => `
Hello ${userName}! 
Your booking has been confirmed for ${vehicleDetails} on ${bookingDate}. 
Thank you for choosing our service!`,

  BOOKING_CANCELLATION: (userName: string, vehicleDetails: string) => `
Hello ${userName}!
Your booking for ${vehicleDetails} has been cancelled. 
We hope to serve you again soon!`,

  PAYMENT_CONFIRMATION: (userName: string, amount: string, bookingId: string) => `
Hello ${userName}!
Your payment of Rs. ${amount} for booking ID: ${bookingId} has been received. 
Thank you for your payment!`,

  BOOKING_REMINDER: (userName: string, vehicleDetails: string, bookingDate: string) => `
Hello ${userName}!
This is a reminder for your upcoming booking of ${vehicleDetails} on ${bookingDate}. 
We're looking forward to serving you!`
}; 