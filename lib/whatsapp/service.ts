import axios from 'axios';
import logger from '@/lib/logger';
import { query } from '@/lib/db';
import crypto from 'crypto';

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

export class WhatsAppService {
    private static instance: WhatsAppService;
    private readonly apiUrl: string;
    private readonly token: string;
    private readonly instanceId: string;
    private isInitialized: boolean = false;
    private initializationPromise: Promise<void>;

    private constructor() {
        this.token = process.env.ULTRAMSG_TOKEN!;
        this.instanceId = process.env.ULTRAMSG_INSTANCE_ID!;
        this.apiUrl = `https://api.ultramsg.com/${this.instanceId}`;

        if (!this.token || !this.instanceId) {
            throw new Error('ULTRAMSG_TOKEN and ULTRAMSG_INSTANCE_ID must be provided');
        }

        // Initialize database and set initialization promise
        this.initializationPromise = this.initializeDatabase()
            .then(() => {
                this.isInitialized = true;
                logger.info('WhatsApp service initialized successfully');
            })
            .catch(error => {
                logger.error('Failed to initialize WhatsApp service:', error);
                this.isInitialized = false;
                throw error;
            });
    }

    private async initializeDatabase() {
        try {
            // Create whatsapp_logs table with TEXT booking_id
            await query(`
                CREATE TABLE IF NOT EXISTS whatsapp_logs (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

            // Create notification_queue table
            await query(`
                CREATE TABLE IF NOT EXISTS notification_queue (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    type TEXT NOT NULL,
                    recipient TEXT NOT NULL,
                    data JSONB NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    error TEXT,
                    retry_count INTEGER DEFAULT 0,
                    next_retry_at TIMESTAMP WITH TIME ZONE,
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
                CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
                CREATE INDEX IF NOT EXISTS idx_notification_queue_type ON notification_queue(type);
                CREATE INDEX IF NOT EXISTS idx_notification_queue_next_retry ON notification_queue(next_retry_at) WHERE status = 'pending';
            `);

            logger.info('WhatsApp database tables initialized successfully');
        } catch (error) {
            logger.error('Error initializing WhatsApp database:', error);
            throw error;
        }
    }

    public static getInstance(): WhatsAppService {
        if (!WhatsAppService.instance) {
            WhatsAppService.instance = new WhatsAppService();
        }
        return WhatsAppService.instance;
    }

    private validatePhoneNumber(phoneNumber: string): string {
        // Remove any non-digit characters
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        
        // Ensure the number starts with country code (91 for India)
        if (cleanNumber.length < 10) {
            throw new Error('Invalid phone number: too short');
        }
        
        // If number doesn't start with 91, add it
        return cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`;
    }

    private generateId(): string {
        return crypto.randomUUID();
    }

    private async logMessage(log: Omit<WhatsAppLog, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
        try {
            // Try to insert without the booking_id first
            const result = await query(
                `INSERT INTO whatsapp_logs (
                    recipient, message, status, 
                    error, message_type, chat_id
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id`,
                [
                    log.recipient,
                    log.message,
                    log.status,
                    log.error || null,
                    log.message_type,
                    log.chat_id || null
                ]
            );

            // If we have a booking_id, update it separately
            if (log.booking_id) {
                await query(
                    `UPDATE whatsapp_logs 
                     SET booking_id = $2
                     WHERE id = $1`,
                    [result.rows[0].id, log.booking_id]
                ).catch(error => {
                    // If update fails, just log it but don't fail the whole operation
                    logger.warn('Failed to update booking_id in whatsapp_logs:', error);
                });
            }

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

    private async waitForInitialization() {
        try {
            await this.initializationPromise;
        } catch (error) {
            logger.error('Failed to initialize WhatsApp service:', error);
            throw new Error('WhatsApp service initialization failed');
        }
    }

    async sendMessage(to: string, message: string, bookingId?: string) {
        // Wait for initialization before proceeding
        await this.waitForInitialization();

        if (!this.isInitialized) {
            throw new Error('WhatsApp service is not properly initialized');
        }

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
                    priority: '10'
                }).toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: 10000 // 10 second timeout
                }
            );

            logger.info('UltraMsg API Response:', response.data);

            // UltraMsg returns sent: "true" (as string) when successful
            if (response.data && response.data.sent === "true") {
                // Update log with success
            await this.updateMessageLog(logId, {
                status: 'success',
                    chat_id: response.data.id?.toString()
                });

                return {
                    success: true,
                    messageId: response.data.id,
                    logId,
                    response: response.data
                };
            } else {
                const errorMessage = response.data?.message || 'Failed to send message';
                throw new Error(errorMessage);
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

    async sendBookingConfirmation(to: string, userName: string, vehicleName: string, startDate: string, bookingId: string) {
        const message = `🎉 Booking Confirmed!\n\n` +
            `Hello ${userName}!\n\n` +
            `Your booking for ${vehicleName} has been confirmed.\n` +
            `Pickup time: ${startDate}\n` +
            `Booking ID: ${bookingId}\n\n` +
            `Thank you for choosing OnnRides! Drive safe! 🚗`;

        return this.sendMessage(to, message, bookingId);
    }

    async sendBookingCancellation(to: string, userName: string, vehicleName: string) {
        const message = `❌ Booking Cancelled\n\n` +
            `Hello ${userName},\n\n` +
            `Your booking for ${vehicleName} has been cancelled.\n\n` +
            `If you didn't request this cancellation, please contact our support:\n` +
            `📞 Phone: +91 8247494622\n` +
            `📧 Email: support@onnrides.com`;

        return this.sendMessage(to, message);
    }

    async sendPaymentConfirmation(to: string, userName: string, amount: string, bookingId: string) {
        const message = `💰 Payment Confirmed\n\n` +
            `Hello ${userName},\n\n` +
            `We've received your payment of ${amount} for booking ID: ${bookingId}.\n\n` +
            `Thank you for choosing OnnRides! 🙏`;

        return this.sendMessage(to, message, bookingId);
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
                    priority: '10'
                }).toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            logger.info('UltraMsg Media API Response:', response.data);

            // UltraMsg returns sent: "true" (as string) when successful
            if (response.data && response.data.sent === "true") {
                await this.updateMessageLog(logId, {
                    status: 'success',
                    chat_id: response.data.id?.toString()
                });

                return {
                    success: true,
                    messageId: response.data.id,
                    logId,
                    response: response.data
                };
            } else {
                const errorMessage = response.data?.message || 'Failed to send media';
                throw new Error(errorMessage);
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
} 