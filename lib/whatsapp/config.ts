import logger from '../logger';
import type { Client } from 'whatsapp-web.js';
import { isServerless } from '@/lib/utils/environment';
import { join } from 'path';
import fs from 'fs';

// Define session directories
const LOCAL_SESSION_DIR = join(process.cwd(), 'whatsapp-sessions');
const SERVERLESS_SESSION_DIR = '/tmp/whatsapp-sessions';

// Get the appropriate session directory based on environment
const getSessionDir = () => {
  if (isServerless()) {
    return SERVERLESS_SESSION_DIR;
  }
  return LOCAL_SESSION_DIR;
};

// Ensure sessions directory exists with appropriate path
const SESSION_DIR = getSessionDir();
try {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }
} catch (error) {
  logger.warn(`Could not create session directory at ${SESSION_DIR}:`, error);
}

let whatsappClient: Client | null = null;
let isInitializing = false;

// Initialize WhatsApp client with appropriate authentication
export async function initializeWhatsAppClient(): Promise<Client | null> {
  if (typeof window !== 'undefined') {
    logger.warn('WhatsApp client cannot be initialized in browser environment');
    return null;
  }

  // In serverless environment, return null immediately
  if (isServerless()) {
    logger.info('WhatsApp client initialization skipped in serverless environment');
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
    const sessionPath = getSessionDir();

    logger.info('Initializing WhatsApp client with session path:', sessionPath);

    // Create session directory if it doesn't exist
    try {
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
      }
    } catch (error) {
      logger.error(`Could not create session directory at ${sessionPath}:`, error);
      throw error;
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
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-blink-features=AutomationControlled'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        timeout: 30000, // Reduced to 30 seconds
        defaultViewport: null,
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false
      },
      qrMaxRetries: 1,
      restartOnAuthFail: false,
      takeoverOnConflict: false,
      takeoverTimeoutMs: 3000,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    // Add connection timeout handler
    const connectionTimeout = setTimeout(() => {
      if (!whatsappClient?.info) {
        const error = new Error('WhatsApp client connection timeout');
        logger.error('WhatsApp client connection error:', error);
        isInitializing = false;
        whatsappClient = null;
        throw error;
      }
    }, 25000); // 25 second timeout

    // Handle disconnection with improved error handling
    whatsappClient.on('disconnected', async (reason) => {
      clearTimeout(connectionTimeout);
      logger.warn('WhatsApp client disconnected:', reason);
      
      await cleanupResources();
    });

    // Handle authentication state with improved error handling
    whatsappClient.on('authenticated', async () => {
      clearTimeout(connectionTimeout);
      logger.info('WhatsApp client authenticated');
      isInitializing = false;
    });

    whatsappClient.on('auth_failure', async (msg) => {
      clearTimeout(connectionTimeout);
      logger.error('WhatsApp authentication failed:', msg);
      
      await cleanupResources();
      throw new Error(`Authentication failed: ${msg}`);
    });

    return whatsappClient;
  } catch (error) {
    await cleanupResources();
    throw error;
  }
}

async function cleanupResources() {
  try {
    // Clear session files
    const sessionPath = getSessionDir();
    if (fs.existsSync(sessionPath)) {
      const sessionFiles = fs.readdirSync(sessionPath);
      for (const file of sessionFiles) {
        const filePath = join(sessionPath, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      logger.info('Cleared WhatsApp session files');
    }

    // Force cleanup browser resources
    if (whatsappClient?.pupPage) {
      await whatsappClient.pupPage.close().catch(() => {});
    }
    if (whatsappClient?.pupBrowser) {
      await whatsappClient.pupBrowser.close().catch(() => {});
    }
  } catch (error) {
    logger.warn('Error during cleanup:', error);
  } finally {
    whatsappClient = null;
    isInitializing = false;
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
Hello ${userName}! 👋

Your payment of ₹${amount} for booking ID: ${bookingId} has been received.
Thank you for choosing OnnRides! 🙏

Need help? Contact us at:
📞 +91 8247494622
📧 contact@onnrides.com`,

  PAYMENT_FAILED: (userName: string, amount: string, bookingId: string, orderId: string) => `
Hello ${userName}! ⚠️

We noticed that your payment of ₹${amount} for booking ID: ${bookingId} was not successful.

Order ID: ${orderId}

Please try again or contact us if you need assistance:
📞 +91 8247494622
📧 contact@onnrides.com`,

  BOOKING_REMINDER: (userName: string, vehicleDetails: string, bookingDate: string) => `
Hello ${userName}!
This is a reminder for your upcoming booking of ${vehicleDetails} on ${bookingDate}. 
We're looking forward to serving you!`
}; 