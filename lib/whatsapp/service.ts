import { WHATSAPP_MESSAGE_TEMPLATES } from './config';
import logger from '../logger';

export class WhatsAppService {
    private static instance: WhatsAppService;
    private isInitialized: boolean = false;
    private whatsappClient: any = null;

    private constructor() {}

    public static getInstance(): WhatsAppService {
        if (!WhatsAppService.instance) {
            WhatsAppService.instance = new WhatsAppService();
        }
        return WhatsAppService.instance;
    }

    public async initialize() {
        if (typeof window !== 'undefined') {
            logger.warn('WhatsApp service cannot be initialized in browser environment');
            return;
        }

        try {
            const { initializeWhatsAppClient } = await import('./config');
            this.whatsappClient = await initializeWhatsAppClient();
            this.isInitialized = !!this.whatsappClient;
            
            if (!this.isInitialized) {
                throw new Error('Failed to initialize WhatsApp client');
            }
        } catch (error) {
            logger.error('Error initializing WhatsApp service:', error);
            throw error;
        }
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
        if (!this.isInitialized || !this.whatsappClient) {
            logger.error('WhatsApp client not initialized');
            return false;
        }

        try {
            const formattedNumber = this.validatePhoneNumber(to);
            const chatId = `${formattedNumber}@c.us`;
            
            await this.whatsappClient.sendMessage(chatId, message);
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