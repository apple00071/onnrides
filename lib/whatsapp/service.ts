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
    status: 'pending' | 'success' | 'failed';
    error?: string;
    message_type: string;
    chat_id?: string;
}

export class WhatsAppService {
    private static instance: WhatsAppService;
    private client: Client | null = null;
    private isInitialized: boolean = false;
    private initializationError: Error | null = null;
    private initializationPromise: Promise<void> | null = null;

    private constructor() {}

    public static getInstance(): WhatsAppService {
        if (!WhatsAppService.instance) {
            WhatsAppService.instance = new WhatsAppService();
        }
        return WhatsAppService.instance;
    }

    public async initialize(): Promise<void> {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = new Promise<void>(async (resolve, reject) => {
            try {
                const { Client, LocalAuth } = await import('whatsapp-web.js');
                
                // Create a new client with proper configuration
                this.client = new Client({
                    authStrategy: new LocalAuth({
                        clientId: 'onnrides-whatsapp',
                        dataPath: './whatsapp-sessions'
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

                // Set up event handlers
                this.client.on('qr', (qr) => {
                    qrcodeTerminal.generate(qr, { small: true });
                    logger.info('WhatsApp QR code generated. Please scan with your WhatsApp app.');
                });

                this.client.on('ready', () => {
                    this.isInitialized = true;
                    this.initializationError = null;
                    logger.info('WhatsApp client is ready and authenticated');
                    resolve();
                });

                this.client.on('authenticated', () => {
                    logger.info('WhatsApp client authenticated successfully');
                });

                this.client.on('auth_failure', (error) => {
                    this.isInitialized = false;
                    this.initializationError = new Error(String(error));
                    logger.error('WhatsApp authentication failed:', error);
                    reject(error);
                });

                this.client.on('disconnected', (reason) => {
                    this.isInitialized = false;
                    this.initializationError = new Error(reason);
                    logger.error('WhatsApp client disconnected:', reason);
                    // Try to reinitialize after disconnection
                    setTimeout(() => {
                        this.initializationPromise = null;
                        this.initialize().catch(logger.error);
                    }, 5000);
                });

                logger.info('Initializing WhatsApp client...');
                await this.client.initialize();
                logger.info('WhatsApp client initialization completed');
            } catch (error) {
                this.isInitialized = false;
                this.initializationError = error instanceof Error ? error : new Error('Unknown error');
                logger.error('Failed to initialize WhatsApp client:', error);
                reject(error);
            }
        });

        return this.initializationPromise;
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

    private async logMessage(log: WhatsAppLog): Promise<string> {
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

    private async updateMessageLog(id: string, updates: Partial<WhatsAppLog>): Promise<void> {
        try {
            const setClauses = Object.entries(updates)
                .map(([key, _], index) => `${key} = $${index + 2}`)
                .join(', ');

            await query(
                `UPDATE whatsapp_logs 
                 SET ${setClauses}, updated_at = NOW()
                 WHERE id = $1`,
                [id, ...Object.values(updates)]
            );
        } catch (error) {
            logger.error('Failed to update WhatsApp message log:', error);
        }
    }

    public async sendMessage(to: string, message: string, bookingId?: string): Promise<void> {
        let logId: string | undefined;
        let retries = 3;

        while (retries > 0) {
            try {
                // Log the pending message if first attempt
                if (!logId) {
                    logId = await this.logMessage({
                        recipient: to,
                        message,
                        booking_id: bookingId,
                        status: 'pending',
                        message_type: 'text'
                    });
                }

                // Check if client needs initialization
                if (!this.client || !this.isInitialized) {
                    logger.info('WhatsApp client not initialized, attempting to initialize...');
                    await this.initialize();
                    
                    if (!this.client || !this.isInitialized) {
                        throw new Error('WhatsApp client initialization failed');
                    }
                }

                // Format the phone number
                const formattedNumber = this.validatePhoneNumber(to);
                
                // Check if the number exists on WhatsApp
                const numberExists = await this.client.isRegisteredUser(`${formattedNumber}@c.us`);
                if (!numberExists) {
                    const error = new Error(`Phone number ${to} is not registered on WhatsApp`);
                    await this.updateMessageLog(logId, {
                        status: 'failed',
                        error: error.message
                    });
                    throw error;
                }

                // Send the message
                const result = await this.client.sendMessage(`${formattedNumber}@c.us`, message);
                
                // Update log with success
                await this.updateMessageLog(logId, {
                    status: 'success',
                    chat_id: result.id.id
                });

                logger.info('WhatsApp message sent successfully', {
                    to: formattedNumber,
                    messageId: result.id.id,
                    bookingId
                });

                return; // Success, exit the retry loop
            } catch (error) {
                retries--;
                logger.error(`Failed to send WhatsApp message (${retries} retries left):`, {
                    error,
                    to,
                    bookingId
                });

                if (retries === 0) {
                    // Update log with final error
                    if (logId) {
                        await this.updateMessageLog(logId, {
                            status: 'failed',
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });
                    }
                    throw error;
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // If client error, reset client for next retry
                if (error instanceof Error && error.message.includes('client')) {
                    this.client = null;
                    this.isInitialized = false;
                    this.initializationPromise = null;
                }
            }
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