import { WHATSAPP_MESSAGE_TEMPLATES, initializeWhatsAppClient } from './config';
import logger from '../logger';
import type { Client } from 'whatsapp-web.js';
import { query } from '@/lib/db';
import { isServerless } from '@/lib/utils';
import fs from 'fs';
import { join } from 'path';

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

type QRCodeHandler = (qr: string) => void;
type ReadyHandler = () => void;

interface WhatsAppLog {
    recipient: string;
    message: string;
    booking_id?: string;
    status: 'pending' | 'success' | 'failed';
    error?: string;
    message_type: string;
    chat_id?: string;
}

// Rate limiting configuration
interface RateLimitConfig {
    windowMs: number;  // Time window in milliseconds
    maxRequests: number;  // Maximum requests per window
}

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

export class WhatsAppService {
    private static instance: WhatsAppService;
    private client: Client | null = null;
    private isInitialized: boolean = false;
    private initializationError: Error | null = null;
    private initializationPromise: Promise<void> | null = null;
    private isServerlessEnv: boolean;
    private qrCodeHandler: QRCodeHandler | null = null;
    private readyHandler: ReadyHandler | null = null;
    private reconnectAttempts: number = 0;
    private readonly MAX_RECONNECT_ATTEMPTS = 3;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private lastConnectionState: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
    private stateCheckInterval: NodeJS.Timeout | null = null;
    
    // Rate limiting properties
    private rateLimits: Map<string, RateLimitEntry> = new Map();
    private readonly rateLimitConfig: RateLimitConfig = {
        windowMs: 60000,  // 1 minute
        maxRequests: 30   // 30 requests per minute
    };

    private constructor() {
        this.isServerlessEnv = isServerless();
        if (this.isServerlessEnv) {
            logger.warn('WhatsApp service running in serverless environment - some features may be limited');
        }
        // Start periodic state check
        this.startStateCheck();
    }

    private startStateCheck() {
        if (this.stateCheckInterval) {
            clearInterval(this.stateCheckInterval);
        }
        
        this.stateCheckInterval = setInterval(async () => {
            try {
                if (this.client && this.client.info) {
                    const state = await this.client.getState().catch(() => null);
                    if (state) {
                        logger.info('Current WhatsApp connection state:', state);
                        this.lastConnectionState = state === 'CONNECTED' ? 'connected' : 'disconnected';
                    }
                }
            } catch (error) {
                // Ignore execution context errors
                if (error instanceof Error && !error.message.includes('Execution context was destroyed')) {
                    logger.error('Error checking WhatsApp state:', error);
                }
            }
        }, 5000); // Check every 5 seconds
    }

    public static getInstance(): WhatsAppService {
        if (!WhatsAppService.instance) {
            WhatsAppService.instance = new WhatsAppService();
        }
        return WhatsAppService.instance;
    }

    public onQRCode(handler: QRCodeHandler) {
        this.qrCodeHandler = handler;
    }

    public onReady(handler: ReadyHandler) {
        this.readyHandler = handler;
    }

    public async initialize(): Promise<void> {
        // In serverless environment, skip full initialization
        if (this.isServerlessEnv) {
            this.isInitialized = true;
            this.lastConnectionState = 'connected';
            return;
        }

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        // Reset state
        this.lastConnectionState = 'connecting';
        this.isInitialized = false;
        this.initializationError = null;

        this.initializationPromise = new Promise<void>(async (resolve, reject) => {
            try {
                // Initialize the WhatsApp client with increased timeout
                this.client = await initializeWhatsAppClient();
                
                if (!this.client) {
                    throw new Error('Failed to initialize WhatsApp client');
                }

                // Set up event handlers
                this.client.on('qr', (qr) => {
                    logger.info('New QR code received');
                    this.lastConnectionState = 'connecting';
                    if (this.qrCodeHandler) {
                        this.qrCodeHandler(qr);
                    } else {
                        logger.warn('QR code received but no handler is set. QR code will not be displayed.');
                    }
                });

                this.client.on('loading_screen', (percent, message) => {
                    logger.info(`WhatsApp loading: ${percent}% - ${message}`);
                    this.lastConnectionState = 'connecting';
                });

                this.client.on('authenticated', async () => {
                    logger.info('WhatsApp client authenticated');
                    this.lastConnectionState = 'connected';
                    this.isInitialized = true;
                    this.initializationError = null;
                    this.reconnectAttempts = 0;

                    // Save session after authentication
                    try {
                        await this.client?.pupPage?.evaluate(() => {
                            localStorage.clear();
                            return true;
                        });
                    } catch (error) {
                        logger.warn('Failed to clear localStorage:', error);
                    }
                });

                this.client.on('ready', () => {
                    this.isInitialized = true;
                    this.initializationError = null;
                    this.lastConnectionState = 'connected';
                    this.reconnectAttempts = 0;
                    logger.info('WhatsApp client is ready and authenticated');
                    
                    if (this.readyHandler) {
                        this.readyHandler();
                    }
                    
                    resolve();
                });

                this.client.on('auth_failure', async (msg) => {
                    this.isInitialized = false;
                    this.lastConnectionState = 'disconnected';
                    this.initializationError = new Error(msg);
                    logger.error('WhatsApp authentication failed:', msg);

                    // Clear session on auth failure
                    await this.clearSessionFiles();
                    
                    // Clear handlers on auth failure
                    this.qrCodeHandler = null;
                    this.readyHandler = null;
                    
                    reject(new Error(msg));
                });

                this.client.on('disconnected', async (reason) => {
                    logger.warn('WhatsApp client disconnected:', reason);
                    this.lastConnectionState = 'disconnected';

                    // Clear the session if authentication is lost
                    if (['UNPAIRED', 'CONFLICT', 'NAVIGATION'].includes(reason)) {
                        await this.clearSessionFiles();
                        this.client = null;
                    }

                    this.isInitialized = false;
                    this.initializationError = new Error(reason);

                    // Clear handlers on disconnection
                    this.qrCodeHandler = null;
                    this.readyHandler = null;

                    // Try to reinitialize after disconnection with exponential backoff
                    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
                        this.reconnectAttempts++;
                        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
                        
                        if (this.reconnectTimeout) {
                            clearTimeout(this.reconnectTimeout);
                        }
                        
                        this.reconnectTimeout = setTimeout(async () => {
                            logger.info(`Attempting to reconnect (attempt ${this.reconnectAttempts})`);
                            this.initializationPromise = null;
                            try {
                                await this.initialize();
                            } catch (error) {
                                logger.error('Reinitialization failed:', error);
                                this.lastConnectionState = 'disconnected';
                            }
                        }, delay);
                        
                        logger.info(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
                    } else {
                        logger.error('Max reconnection attempts reached');
                        this.lastConnectionState = 'disconnected';
                        // Reset reconnect attempts after a longer delay
                        setTimeout(() => {
                            this.reconnectAttempts = 0;
                        }, 60000);
                    }
                });

                logger.info('Starting WhatsApp client initialization...');
                await this.client.initialize();
            } catch (error) {
                this.isInitialized = false;
                this.lastConnectionState = 'disconnected';
                this.initializationError = error instanceof Error ? error : new Error('Unknown error');
                logger.error('Failed to initialize WhatsApp client:', error);

                // Clear handlers on error
                this.qrCodeHandler = null;
                this.readyHandler = null;

                reject(error);
            }
        });

        return this.initializationPromise;
    }

    public getInitializationStatus(): { 
        isInitialized: boolean; 
        error: Error | null;
        connectionState: 'connected' | 'disconnected' | 'connecting';
    } {
        // Force a state check
        if (this.client?.info) {
            this.lastConnectionState = 'connected';
            this.isInitialized = true;
        } else if (this.initializationPromise) {
            this.lastConnectionState = 'connecting';
        } else {
            this.lastConnectionState = 'disconnected';
            this.isInitialized = false;
        }

        return {
            isInitialized: this.isInitialized,
            error: this.initializationError,
            connectionState: this.lastConnectionState
        };
    }

    private validatePhoneNumber(phoneNumber: string): string {
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        return cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`;
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

    private checkRateLimit(phoneNumber: string): boolean {
        const now = Date.now();
        const entry = this.rateLimits.get(phoneNumber);

        if (!entry || now >= entry.resetTime) {
            // If no entry exists or the window has expired, create a new entry
            this.rateLimits.set(phoneNumber, {
                count: 1,
                resetTime: now + this.rateLimitConfig.windowMs
            });
            return true;
        }

        if (entry.count >= this.rateLimitConfig.maxRequests) {
            // Rate limit exceeded
            return false;
        }

        // Increment the counter
        entry.count++;
        return true;
    }

    private cleanupRateLimits(): void {
        const now = Date.now();
        for (const [phone, entry] of this.rateLimits.entries()) {
            if (now >= entry.resetTime) {
                this.rateLimits.delete(phone);
            }
        }
    }

    public async sendMessage(to: string, message: string, bookingId?: string): Promise<void> {
        // Clean up expired rate limits
        this.cleanupRateLimits();

        // Check rate limit
        if (!this.checkRateLimit(to)) {
            const error = new Error(`Rate limit exceeded for ${to}. Please try again later.`);
            await this.logMessage({
                recipient: to,
                message,
                booking_id: bookingId,
                status: 'failed',
                error: error.message,
                message_type: 'text'
            });
            throw error;
        }

        let logId: string | undefined;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                // Log the pending message
                if (!logId) {
                    logId = await this.logMessage({
                        recipient: to,
                        message,
                        booking_id: bookingId,
                        status: 'pending',
                        message_type: 'text'
                    });
                }

                // In serverless environment, just log the message
                if (this.isServerlessEnv) {
                    await this.updateMessageLog(logId, {
                        status: 'success',
                        error: 'Message logged (serverless environment)'
                    });
                    logger.info('Message logged for later sending:', {
                        to,
                        bookingId,
                        logId
                    });
                    return;
                }

                // If not initialized, try to initialize
                if (!this.isInitialized || !this.client) {
                    logger.info('WhatsApp client not initialized, attempting to initialize...');
                    await this.initialize();
                    
                    if (!this.isInitialized || !this.client) {
                        throw new Error('Failed to initialize WhatsApp client');
                    }
                }

                const formattedNumber = this.validatePhoneNumber(to);
                const numberExists = await this.client.isRegisteredUser(`${formattedNumber}@c.us`);
                
                if (!numberExists) {
                    throw new Error(`Phone number ${to} is not registered on WhatsApp`);
                }

                const result = await this.client.sendMessage(`${formattedNumber}@c.us`, message);
                
                await this.updateMessageLog(logId, {
                    status: 'success',
                    chat_id: result.id.id
                });

                logger.info('WhatsApp message sent successfully', {
                    to: formattedNumber,
                    messageId: result.id.id,
                    bookingId
                });

                return;
            } catch (error) {
                attempts++;
                logger.error(`Failed to send WhatsApp message (attempt ${attempts}/${maxAttempts}):`, {
                    error,
                    to,
                    bookingId
                });

                if (attempts === maxAttempts) {
                    if (logId) {
                        await this.updateMessageLog(logId, {
                            status: 'failed',
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });
                    }
                    throw error;
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
                
                // If client error, try to reinitialize
                if (!this.client || !this.isInitialized) {
                    this.initializationPromise = null;
                    try {
                        await this.initialize();
                    } catch (initError) {
                        logger.error('Failed to reinitialize WhatsApp client:', initError);
                    }
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
        try {
            const message = WHATSAPP_MESSAGE_TEMPLATES.BOOKING_CONFIRMATION(
                userName,
                vehicleDetails,
                bookingDate
            );
            await this.sendMessage(phone, message, bookingId);
            return true;
        } catch (error) {
            logger.error('Failed to send booking confirmation:', error);
            return false;
        }
    }

    public async sendBookingCancellation(
        phone: string,
        userName: string,
        vehicleDetails: string,
        bookingId?: string
    ): Promise<boolean> {
        try {
            const message = WHATSAPP_MESSAGE_TEMPLATES.BOOKING_CANCELLATION(
                userName,
                vehicleDetails
            );
            await this.sendMessage(phone, message, bookingId);
            return true;
        } catch (error) {
            logger.error('Failed to send booking cancellation:', error);
            return false;
        }
    }

    public async sendPaymentConfirmation(
        phone: string,
        userName: string,
        amount: string,
        bookingId: string
    ): Promise<boolean> {
        try {
            const message = WHATSAPP_MESSAGE_TEMPLATES.PAYMENT_CONFIRMATION(
                userName,
                amount,
                bookingId
            );
            await this.sendMessage(phone, message, bookingId);
            return true;
        } catch (error) {
            logger.error('Failed to send payment confirmation:', error);
            return false;
        }
    }

    public async sendBookingReminder(
        phone: string,
        userName: string,
        vehicleDetails: string,
        bookingDate: string,
        bookingId?: string
    ): Promise<boolean> {
        try {
            const message = WHATSAPP_MESSAGE_TEMPLATES.BOOKING_REMINDER(
                userName,
                vehicleDetails,
                bookingDate
            );
            await this.sendMessage(phone, message, bookingId);
            return true;
        } catch (error) {
            logger.error('Failed to send booking reminder:', error);
            return false;
        }
    }

    private async clearSessionFiles() {
        if (this.isServerlessEnv) {
            logger.info('Skipping session file cleanup in serverless environment');
            return;
        }

        try {
            const sessionPath = getSessionDir();
            const sessionFiles = fs.readdirSync(sessionPath);
            for (const file of sessionFiles) {
                const filePath = join(sessionPath, file);
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                    } catch (unlinkError) {
                        logger.warn(`Failed to delete session file ${file}:`, unlinkError);
                    }
                }
            }
            logger.info('Cleared WhatsApp session files');
        } catch (error) {
            logger.error('Error clearing session files:', error);
        }
    }
} 