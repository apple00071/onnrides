import { whatsappClient, WHATSAPP_MESSAGE_TEMPLATES } from './config';
import winston from 'winston';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
});

export class WhatsAppService {
    private static instance: WhatsAppService;
    private isInitialized: boolean = false;

    private constructor() {}

    public static getInstance(): WhatsAppService {
        if (!WhatsAppService.instance) {
            WhatsAppService.instance = new WhatsAppService();
        }
        return WhatsAppService.instance;
    }

    private validatePhoneNumber(phoneNumber: string): string {
        // Remove any non-numeric characters
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        
        // Ensure the number starts with country code
        if (!cleanNumber.startsWith('91')) {
            return `91${cleanNumber}`;
        }
        
        return cleanNumber;
    }

    private async sendMessage(to: string, message: string): Promise<boolean> {
        try {
            if (!this.isInitialized) {
                logger.error('WhatsApp client not initialized');
                return false;
            }

            const formattedNumber = await this.validatePhoneNumber(to);
            const chatId = `${formattedNumber}@c.us`;
            
            await whatsappClient.sendMessage(chatId, message);
            logger.info(`Message sent successfully to ${to}`);
            return true;
        } catch (error) {
            logger.error('Error sending WhatsApp message:', error);
            return false;
        }
    }

    public async sendBookingConfirmation(
        phoneNumber: string,
        userName: string,
        vehicleDetails: string,
        bookingDate: string
    ): Promise<boolean> {
        const message = WHATSAPP_MESSAGE_TEMPLATES.BOOKING_CONFIRMATION(
            userName,
            vehicleDetails,
            bookingDate
        );
        return this.sendMessage(phoneNumber, message);
    }

    public async sendBookingCancellation(
        phoneNumber: string,
        userName: string,
        vehicleDetails: string
    ): Promise<boolean> {
        const message = WHATSAPP_MESSAGE_TEMPLATES.BOOKING_CANCELLATION(
            userName,
            vehicleDetails
        );
        return this.sendMessage(phoneNumber, message);
    }

    public async sendPaymentConfirmation(
        phoneNumber: string,
        userName: string,
        amount: string,
        bookingId: string
    ): Promise<boolean> {
        const message = WHATSAPP_MESSAGE_TEMPLATES.PAYMENT_CONFIRMATION(
            userName,
            amount,
            bookingId
        );
        return this.sendMessage(phoneNumber, message);
    }

    public async sendBookingReminder(
        phoneNumber: string,
        userName: string,
        vehicleDetails: string,
        bookingDate: string
    ): Promise<boolean> {
        const message = WHATSAPP_MESSAGE_TEMPLATES.BOOKING_REMINDER(
            userName,
            vehicleDetails,
            bookingDate
        );
        return this.sendMessage(phoneNumber, message);
    }
} 