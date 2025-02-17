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

    private constructor() {
        this.token = process.env.ULTRAMSG_TOKEN!;
        this.instanceId = process.env.ULTRAMSG_INSTANCE_ID!;
        this.apiUrl = `https://api.ultramsg.com/${this.instanceId}`;

        if (!this.token || !this.instanceId) {
            throw new Error('ULTRAMSG_TOKEN and ULTRAMSG_INSTANCE_ID must be provided');
        }

        // Initialize database
        this.initializeDatabase().catch(error => {
            logger.error('Failed to initialize database:', error);
        });
    }

    private async initializeDatabase() {
        try {
            // Create whatsapp_logs table
            await query(`
                CREATE TABLE IF NOT EXISTS whatsapp_logs (
                    id UUID PRIMARY KEY,
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
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        return cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`;
    }

    private generateId(): string {
        return crypto.randomUUID();
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
                    priority: '10'
                }).toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
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