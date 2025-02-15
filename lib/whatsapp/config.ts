import logger from '../logger';
import type { Client } from 'whatsapp-web.js';
import { isServerless } from '@/lib/utils';
import { join } from 'path';
import fs from 'fs';

// Ensure sessions directory exists with absolute path
const SESSION_DIR = join(process.cwd(), 'whatsapp-sessions');
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

let whatsappClient: Client | null = null;
let isInitializing = false;

// Initialize WhatsApp client with appropriate authentication
export async function initializeWhatsAppClient(): Promise<Client | null> {
  if (typeof window !== 'undefined') {
    logger.warn('WhatsApp client cannot be initialized in browser environment');
    return null;
  }

  // If client exists and is ready, return it
  if (whatsappClient?.info) {
    logger.info('Using existing WhatsApp client');
    return whatsappClient;
  }

  // If already initializing, wait for it
  if (isInitializing) {
    logger.info('WhatsApp client initialization already in progress');
    return null;
  }

  isInitializing = true;

  try {
    const { Client, LocalAuth } = await import('whatsapp-web.js');
    
    // Use a consistent session ID
    const sessionId = 'onnrides-whatsapp-session';
    const sessionPath = isServerless() ? '/tmp/whatsapp-sessions' : SESSION_DIR;

    logger.info('Initializing WhatsApp client with session path:', sessionPath);

    // Create session directory if it doesn't exist
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    // Use different auth strategy based on environment
    const authStrategy = new LocalAuth({
      clientId: sessionId,
      dataPath: sessionPath
    });
    
    whatsappClient = new Client({
      authStrategy,
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--single-process',
          '--disable-software-rasterizer',
          '--disable-extensions',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        timeout: 120000,
        defaultViewport: null
      },
      qrMaxRetries: 3,
      restartOnAuthFail: true,
      takeoverOnConflict: true,
      takeoverTimeoutMs: 10000
    });

    // Handle disconnection
    whatsappClient.on('disconnected', async (reason) => {
      logger.warn('WhatsApp client disconnected:', reason);
      
      // Clear the session if authentication is lost or navigation error occurs
      if (reason === 'UNPAIRED' || reason === 'CONFLICT' || reason.includes('CONFLICT') || reason.includes('NAVIGATION')) {
        try {
          const sessionFiles = fs.readdirSync(sessionPath);
          for (const file of sessionFiles) {
            const filePath = join(sessionPath, file);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
          logger.info('Cleared WhatsApp session files');
          whatsappClient = null;
          isInitializing = false;
        } catch (error) {
          logger.error('Error clearing session files:', error);
        }
      }
    });

    // Handle authentication state
    whatsappClient.on('authenticated', async () => {
      logger.info('WhatsApp client authenticated');
      isInitializing = false;
      
      // Clear localStorage to prevent stale data
      try {
        if (whatsappClient?.pupPage) {
          await whatsappClient.pupPage.evaluate(() => {
            localStorage.clear();
            return true;
          });
        }
      } catch (error) {
        logger.warn('Failed to clear localStorage:', error);
      }
    });

    whatsappClient.on('auth_failure', async () => {
      logger.error('WhatsApp authentication failed');
      isInitializing = false;
      
      // Clear session on auth failure
      try {
        const sessionFiles = fs.readdirSync(sessionPath);
        for (const file of sessionFiles) {
          const filePath = join(sessionPath, file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
        logger.info('Cleared WhatsApp session files after auth failure');
      } catch (error) {
        logger.error('Error clearing session files:', error);
      }
      
      whatsappClient = null;
    });

    return whatsappClient;
  } catch (error) {
    logger.error('Error importing WhatsApp dependencies:', error);
    isInitializing = false;
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

    // Generate QR Code for authentication if needed
    client.on('qr', async (qr: string) => {
      logger.info('WhatsApp QR Code generated. Please scan with your WhatsApp app.');
      
      // Only try to use qrcode-terminal in development
      if (process.env.NODE_ENV === 'development') {
        try {
          // Dynamic import of qrcode-terminal
          const qrcodeTerminal = (await import('qrcode-terminal')).default;
          qrcodeTerminal(qr, { small: true });
        } catch (error) {
          logger.warn('qrcode-terminal not available:', error);
        }
      }
    });

    // Handle successful authentication
    client.on('ready', () => {
      logger.info('WhatsApp client is ready and authenticated!');
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

  PAYMENT_FAILED: (userName: string, amount: string, bookingId: string, orderId: string) => `
Hello ${userName}!
We noticed that your payment of Rs. ${amount} for booking ID: ${bookingId} was not successful.
Order ID: ${orderId}

Please try again or contact our support if you need assistance.
Support: support@onnrides.com`,

  BOOKING_REMINDER: (userName: string, vehicleDetails: string, bookingDate: string) => `
Hello ${userName}!
This is a reminder for your upcoming booking of ${vehicleDetails} on ${bookingDate}. 
We're looking forward to serving you!`
}; 