import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import logger from '../logger';

// Initialize WhatsApp client with local authentication
export const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Initialize WhatsApp client
export const initializeWhatsApp = async () => {
    try {
        // Generate QR Code for authentication
        whatsappClient.on('qr', (qr) => {
            logger.info('WhatsApp QR Code generated. Please scan with your WhatsApp app.');
            qrcode.generate(qr, { small: true });
        });

        // Handle successful authentication
        whatsappClient.on('ready', () => {
            logger.info('WhatsApp client is ready!');
        });

        // Handle authentication failures
        whatsappClient.on('auth_failure', (msg) => {
            logger.error('WhatsApp authentication failed:', msg);
        });

        // Initialize the client
        await whatsappClient.initialize();
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