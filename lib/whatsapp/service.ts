import axios from 'axios';
import logger from '@/lib/logger';
import { Client, LocalAuth } from 'whatsapp-web.js';
import { initializeWhatsAppClient } from './config';
import { query } from '@/lib/db';
import express from 'express';
import QRCode from 'qrcode';

interface WhatsAppLog {
    id: string;
    recipient: string;
    message: string;
    booking_id?: string;
    status: 'pending' | 'success' | 'failed';
    error?: string;
    message_type: string;
    chat_id?: string;
    created_at: string;
    updated_at: string;
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

interface InitializationStatus {
    isInitialized: boolean;
    error?: Error;
}

const app = express();
const port = process.env.WHATSAPP_PORT || 3001;

export class WhatsAppService {
    private static instance: WhatsAppService;
    private readonly apiUrl: string;
    private readonly token: string;
    private readonly instanceId: string;
    private client: Client;
    private isInitialized: boolean = false;
    private initializationError: Error | null = null;
    private qrCode: string | null = null;
    
    // Rate limiting properties
    private readonly rateLimitConfig: RateLimitConfig = {
        windowMs: 60000,  // 1 minute
        maxRequests: 30   // 30 requests per minute
    };

    private constructor() {
        this.token = process.env.ULTRAMSG_TOKEN!;
        this.instanceId = process.env.ULTRAMSG_INSTANCE_ID!;
        this.apiUrl = `https://api.ultramsg.com/${this.instanceId}`;

        if (!this.token || !this.instanceId) {
            throw new Error('ULTRAMSG_TOKEN and ULTRAMSG_INSTANCE_ID must be provided');
        }

        // Initialize Express server for health checks and QR code
        app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'healthy',
                initialized: this.isInitialized,
                hasQR: !!this.qrCode,
                timestamp: new Date().toISOString()
            });
        });

        app.get('/qr', (req, res) => {
            if (this.qrCode) {
                res.type('png').send(Buffer.from(this.qrCode, 'base64'));
            } else {
                res.status(404).json({ error: 'QR code not available' });
            }
        });

        app.listen(port, () => {
            logger.info(`WhatsApp service running on port ${port}`);
        });

        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: "onnrides-whatsapp",
                dataPath: process.env.WWEBJS_AUTH_PATH || ".wwebjs_auth"
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
                    '--single-process',
                    '--disable-gpu'
                ],
                executablePath: process.env.CHROME_BIN || undefined
            }
        });

        this.initializeClient();
    }

    private async initializeDatabase() {
        try {
            // Create whatsapp_logs table
            await query(`
                CREATE TABLE IF NOT EXISTS whatsapp_logs (
                    id TEXT PRIMARY KEY,
                    recipient TEXT NOT NULL,
                    message TEXT NOT NULL,
                    booking_id TEXT,
                    status TEXT NOT NULL,
                    error TEXT,
                    message_type TEXT NOT NULL,
                    chat_id TEXT,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create rate_limits table
            await query(`
                CREATE TABLE IF NOT EXISTS rate_limits (
                    phone TEXT PRIMARY KEY,
                    count INTEGER NOT NULL,
                    reset_time BIGINT NOT NULL
                )
            `);

            // Create indices
            await query(`
                CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_recipient ON whatsapp_logs(recipient);
                CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON whatsapp_logs(status);
                CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_booking_id ON whatsapp_logs(booking_id);
            `);
        } catch (error) {
            logger.error('Error initializing WhatsApp database:', error);
        }
    }

    private async initializeClient() {
        try {
            this.client.on('qr', async (qr) => {
                try {
                    // Generate QR code as base64 PNG
                    this.qrCode = await QRCode.toDataURL(qr);
                    const qrUrl = `${process.env.RAILWAY_STATIC_URL || 'http://localhost:3001'}/qr`;
                    logger.info('New QR Code generated. Access it at:', qrUrl);
                } catch (error) {
                    logger.error('Failed to generate QR code:', error);
                }
            });

            this.client.on('ready', () => {
                this.isInitialized = true;
                this.qrCode = null; // Clear QR code once authenticated
                logger.info('WhatsApp client is ready!');
            });

            this.client.on('authenticated', () => {
                this.qrCode = null;
                logger.info('WhatsApp client authenticated successfully');
            });

            this.client.on('auth_failure', (msg) => {
                this.initializationError = new Error(msg.toString());
                logger.error('WhatsApp authentication failed:', msg);
            });

            this.client.on('disconnected', (reason) => {
                this.isInitialized = false;
                logger.warn('WhatsApp client disconnected:', reason);
                // Attempt to reconnect after a delay
                setTimeout(() => {
                    logger.info('Attempting to reconnect...');
                    this.client.initialize().catch(error => {
                        logger.error('Failed to reconnect:', error);
                    });
                }, 5000);
            });

            await this.client.initialize();
        } catch (error) {
            this.initializationError = error instanceof Error ? error : new Error('Unknown error during initialization');
            logger.error('Failed to initialize WhatsApp client:', error);
            // Attempt to reinitialize after a delay
            setTimeout(() => this.initializeClient(), 10000);
        }
    }

    public static getInstance(): WhatsAppService {
        if (!WhatsAppService.instance) {
            WhatsAppService.instance = new WhatsAppService();
        }
        return WhatsAppService.instance;
    }

    public getInitializationStatus(): InitializationStatus {
        return {
            isInitialized: this.isInitialized,
            error: this.initializationError || undefined
        };
    }

    private validatePhoneNumber(phoneNumber: string): string {
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        return cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`;
    }

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    private async logMessage(log: Omit<WhatsAppLog, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
        try {
            const id = this.generateId();
            const result = await query(
                `INSERT INTO whatsapp_logs (
                    id, recipient, message, booking_id, status, 
                    error, message_type, chat_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id`,
                [
                    id,
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
            const setClause = Object.entries(updates)
                .map(([key], index) => `${key} = $${index + 2}`)
                .join(', ');

            await query(
                `UPDATE whatsapp_logs 
                 SET ${setClause}, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [id, ...Object.values(updates)]
            );
        } catch (error) {
            logger.error('Failed to update WhatsApp message log:', error);
        }
    }

    private async checkRateLimit(phoneNumber: string): Promise<boolean> {
        const now = Date.now();

        try {
            // Clean up old rate limits
            await query(
                'DELETE FROM rate_limits WHERE reset_time < $1',
                [now]
            );

            // Get current rate limit
            const result = await query(
                'SELECT count, reset_time FROM rate_limits WHERE phone = $1',
                [phoneNumber]
            );

            if (result.rowCount === 0) {
                // Create new rate limit
                await query(
                    'INSERT INTO rate_limits (phone, count, reset_time) VALUES ($1, 1, $2)',
                    [phoneNumber, now + this.rateLimitConfig.windowMs]
                );
                return true;
            }

            const rateLimit = result.rows[0];
            if (rateLimit.count >= this.rateLimitConfig.maxRequests) {
                return false;
            }

            // Increment count
            await query(
                'UPDATE rate_limits SET count = count + 1 WHERE phone = $1',
                [phoneNumber]
            );

            return true;
        } catch (error) {
            logger.error('Error checking rate limit:', error);
            return false;
        }
    }

    async sendMessage(to: string, message: string, bookingId?: string) {
        const phoneNumber = this.validatePhoneNumber(to);
        let logId: string | undefined;

        try {
            // Log the pending message
            logId = await this.logMessage({
                recipient: phoneNumber,
                message,
                booking_id: bookingId,
                status: 'pending',
                message_type: 'text'
            });

            const response = await axios.post(
                `${this.apiUrl}/messages/chat`,
                new URLSearchParams({
                    token: this.token,
                    to: phoneNumber,
                    body: message,
                    priority: '1'
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            if (response.data.status === 'success') {
                // Update log with success
                await this.updateMessageLog(logId, {
                    status: 'success',
                    chat_id: response.data.id
                });

                return {
                    success: true,
                    messageId: response.data.id,
                    logId
                };
            } else {
                throw new Error(response.data.message || 'Failed to send message');
            }

        } catch (error) {
            logger.error('Error sending WhatsApp message:', error);

            if (logId) {
                await this.updateMessageLog(logId, {
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }

            throw error;
        }
    }

    async sendMedia(to: string, mediaUrl: string, caption: string = '', bookingId?: string) {
        const phoneNumber = this.validatePhoneNumber(to);
        let logId: string | undefined;

        try {
            logId = await this.logMessage({
                recipient: phoneNumber,
                message: caption,
                booking_id: bookingId,
                status: 'pending',
                message_type: 'media'
            });

            const response = await axios.post(
                `${this.apiUrl}/messages/image`,
                new URLSearchParams({
                    token: this.token,
                    to: phoneNumber,
                    image: mediaUrl,
                    caption: caption,
                    priority: '1'
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            if (response.data.status === 'success') {
                await this.updateMessageLog(logId, {
                    status: 'success',
                    chat_id: response.data.id
                });

                return {
                    success: true,
                    messageId: response.data.id,
                    logId
                };
            } else {
                throw new Error(response.data.message || 'Failed to send media');
            }

        } catch (error) {
            logger.error('Error sending WhatsApp media:', error);

            if (logId) {
                await this.updateMessageLog(logId, {
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
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
        try {
            const message = `Hello ${userName}!\nYour booking has been confirmed for ${vehicleDetails} on ${bookingDate}.\nThank you for choosing our service!`;
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
            const message = `Hello ${userName}!\nYour booking for ${vehicleDetails} has been cancelled.\nWe hope to serve you again soon!`;
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
            const message = `Hello ${userName}!\nYour payment of Rs. ${amount} for booking ID: ${bookingId} has been received.\nThank you for your payment!`;
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
            const message = `Hello ${userName}!\nThis is a reminder for your upcoming booking of ${vehicleDetails} on ${bookingDate}.\nWe're looking forward to serving you!`;
            await this.sendMessage(phone, message, bookingId);
            return true;
        } catch (error) {
            logger.error('Failed to send booking reminder:', error);
            return false;
        }
    }
}

// Initialize the service
WhatsAppService.getInstance(); 