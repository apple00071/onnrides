import { WHATSAPP_MESSAGE_TEMPLATES } from './config';
import logger from '../logger';
import type { Client } from 'whatsapp-web.js';
import { query } from '@/lib/db';

// Use require for qrcode-terminal since it doesn't have TypeScript types
const qrcodeTerminal = require('qrcode-terminal');

interface WhatsAppLog {
    recipient: string;
    message: string;
    booking_id?: string;
    status: 'pending' | 'success' | 'error';
    error?: string;
    message_type: string;
    chat_id?: string;
}

export class WhatsAppService {
    private static instance: WhatsAppService;
    private isInitialized: boolean = false;
    private whatsappClient: Client | null = null;
    private initializationError: Error | null = null;
    private initializationPromise: Promise<void> | null = null;
    private authTimeout: NodeJS.Timeout | null = null;

    private constructor() {}

    public static getInstance(): WhatsAppService {
        if (!WhatsAppService.instance) {
            WhatsAppService.instance = new WhatsAppService();
        }
        return WhatsAppService.instance;
    }

    public async initialize() {
        // Check if we're in a browser environment
        if (typeof process === 'undefined' || !process.versions || process.versions.node === undefined) {
            logger.warn('WhatsApp service cannot be initialized in browser environment');
            return;
        }

        // If already initializing, return the existing promise
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._initialize();
        return this.initializationPromise;
    }

    private async _initialize() {
        try {
            // Clear any existing timeout
            if (this.authTimeout) {
                clearTimeout(this.authTimeout);
                this.authTimeout = null;
            }

            // Check if already initialized
            if (this.isInitialized && this.whatsappClient) {
                logger.info('WhatsApp service already initialized');
                return;
            }

            logger.info('Initializing WhatsApp service...');
            const { initializeWhatsAppClient } = await import('./config');
            this.whatsappClient = await initializeWhatsAppClient();
            
            if (!this.whatsappClient) {
                throw new Error('WhatsApp client initialization failed');
            }

            // Add event listeners for client state
            this.whatsappClient.on('ready', () => {
                logger.info('WhatsApp client is ready and authenticated');
                this.isInitialized = true;
                this.initializationError = null;
                
                // Clear auth timeout if it exists
                if (this.authTimeout) {
                    clearTimeout(this.authTimeout);
                }
            });

            this.whatsappClient.on('auth_failure', (error: any) => {
                logger.error('WhatsApp authentication failed:', error);
                this.isInitialized = false;
                this.initializationError = new Error('Authentication failed');
            });

            this.whatsappClient.on('disconnected', (reason: string) => {
                logger.warn('WhatsApp client disconnected:', reason);
                this.isInitialized = false;
            });

            // Generate QR code for authentication
            this.whatsappClient.on('qr', (qr: string) => {
                logger.info('WhatsApp QR Code generated. Please scan with your WhatsApp app.');
                try {
                    qrcodeTerminal.generate(qr, { small: true });
                    
                    // Set a timeout for QR code scanning
                    if (this.authTimeout) {
                        clearTimeout(this.authTimeout);
                    }
                    this.authTimeout = setTimeout(() => {
                        if (!this.isInitialized) {
                            logger.error('QR code scanning timeout - please try again');
                            this.initializationError = new Error('QR code scanning timeout');
                        }
                    }, 60000); // 60 seconds timeout
                } catch (error) {
                    logger.error('Error generating QR code:', error);
                }
            });

            await this.whatsappClient.initialize();
            logger.info('WhatsApp client initialization completed');
            
        } catch (error) {
            this.isInitialized = false;
            this.initializationError = error instanceof Error ? error : new Error('Unknown error');
            logger.error('Error initializing WhatsApp service:', {
                error: this.initializationError,
                stack: this.initializationError.stack
            });
            throw this.initializationError;
        } finally {
            this.initializationPromise = null;
        }
    }

    public getInitializationStatus(): { 
        isInitialized: boolean; 
        error: Error | null;
    } {
        return {
            isInitialized: this.isInitialized,
            error: this.initializationError
        };
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

    private async logMessage(log: WhatsAppLog) {
        try {
            const result = await query(
                `INSERT INTO whatsapp_logs (recipient, message, booking_id, status, error, message_type, chat_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id`,
                [
                    log.recipient,
                    log.message,
                    log.booking_id || null,
                    log.status,
                    log.error || null,
                    log.message_type,
                    log.chat_id || null
                ]
            );
            return result.rows[0].id;
        } catch (error) {
            logger.error('Failed to log WhatsApp message:', error);
            throw error;
        }
    }

    public async sendMessage(to: string, message: string, bookingId?: string) {
        try {
            if (!this.whatsappClient) {
                throw new Error('WhatsApp client not initialized');
            }

            // Log the message as pending
            const logId = await this.logMessage({
                recipient: to,
                message,
                booking_id: bookingId,
                status: 'pending',
                message_type: 'text'
            });

            // Send the message
            const formattedNumber = this.validatePhoneNumber(to);
            const chatId = `${formattedNumber}@c.us`;
            const result = await this.whatsappClient.sendMessage(chatId, message);

            // Update the log with success status and chat ID
            await query(
                `UPDATE whatsapp_logs 
                 SET status = $1, chat_id = $2 
                 WHERE id = $3`,
                ['success', result.id.id, logId]
            );

            return result;
        } catch (error) {
            // Log the error
            if (error instanceof Error) {
                await query(
                    `UPDATE whatsapp_logs 
                     SET status = $1, error = $2 
                     WHERE recipient = $3 AND message = $4 AND status = 'pending'`,
                    ['error', error.message, to, message]
                );
            }
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
        const message = WHATSAPP_MESSAGE_TEMPLATES.BOOKING_CONFIRMATION(
            userName,
            vehicleDetails,
            bookingDate
        );
        return this.sendMessage(phone, message, bookingId) instanceof Promise;
    }

    public async sendBookingCancellation(
        phone: string,
        userName: string,
        vehicleDetails: string,
        bookingId?: string
    ): Promise<boolean> {
        const message = WHATSAPP_MESSAGE_TEMPLATES.BOOKING_CANCELLATION(
            userName,
            vehicleDetails
        );
        return this.sendMessage(phone, message, bookingId) instanceof Promise;
    }

    public async sendPaymentConfirmation(
        phone: string,
        userName: string,
        amount: string,
        bookingId: string
    ): Promise<boolean> {
        const message = WHATSAPP_MESSAGE_TEMPLATES.PAYMENT_CONFIRMATION(
            userName,
            amount,
            bookingId
        );
        return this.sendMessage(phone, message, bookingId) instanceof Promise;
    }

    public async sendBookingReminder(
        phone: string,
        userName: string,
        vehicleDetails: string,
        bookingDate: string,
        bookingId?: string
    ): Promise<boolean> {
        const message = WHATSAPP_MESSAGE_TEMPLATES.BOOKING_REMINDER(
            userName,
            vehicleDetails,
            bookingDate
        );
        return this.sendMessage(phone, message, bookingId) instanceof Promise;
    }
} 