import axios from 'axios';
import logger from '@/lib/logger';
import { query } from '@/lib/db';
import crypto from 'crypto';

interface WhatsAppMessageLog {
    recipient: string;
    message: string;
    booking_id?: string | null;
    status: 'pending' | 'success' | 'failed';
    error?: string;
    message_type: 'text' | 'media';
    chat_id?: string;
}

export class WhatsAppService {
    private static instance: WhatsAppService;
    private readonly apiUrl: string;
    private readonly token: string;
    private readonly instanceId: string;
    private isInitialized: boolean = false;
    private initializationPromise: Promise<void>;

    private constructor() {
        // Get configuration from environment variables
        this.token = process.env.ULTRAMSG_TOKEN || '';
        this.instanceId = process.env.ULTRAMSG_INSTANCE_ID || '';
        this.apiUrl = `https://api.ultramsg.com/${this.instanceId}`;

        // Log configuration (without sensitive data)
        logger.info('WhatsApp Service Configuration:', {
            hasToken: !!this.token,
            instanceId: this.instanceId,
            apiUrl: this.apiUrl
        });

        // Initialize the service
        this.initializationPromise = this.initialize();
    }

    public static getInstance(): WhatsAppService {
        if (!WhatsAppService.instance) {
            WhatsAppService.instance = new WhatsAppService();
        }
        return WhatsAppService.instance;
    }

    private async initialize(): Promise<void> {
        try {
            // Validate configuration
            if (!this.token || !this.instanceId) {
                throw new Error('WhatsApp service configuration is incomplete');
            }

            // Test the connection
            const response = await axios.get(`${this.apiUrl}/instance/status`, {
                params: { token: this.token }
            });

            if (response.data?.status !== 'connected') {
                throw new Error('WhatsApp instance is not connected');
            }

            this.isInitialized = true;
            logger.info('WhatsApp service initialized successfully');
        } catch (error) {
            this.isInitialized = false;
            logger.error('Failed to initialize WhatsApp service:', error);
            throw error;
        }
    }

    private async waitForInitialization(): Promise<void> {
        try {
            await this.initializationPromise;
        } catch (error) {
            logger.error('WhatsApp service initialization failed:', error);
            throw new Error('WhatsApp service is not available');
        }
    }

    private validatePhoneNumber(phone: string): string {
        // Remove any non-digit characters
        const cleaned = phone.replace(/\D/g, '');
        
        // Add country code if not present (assuming Indian numbers)
        if (cleaned.length === 10) {
            return `91${cleaned}`;
        }
        
        // If already has country code
        if (cleaned.startsWith('91') && cleaned.length === 12) {
            return cleaned;
        }
        
        throw new Error('Invalid phone number format');
    }

    private generateId(): string {
        return crypto.randomUUID();
    }

    private async logMessage(log: Omit<WhatsAppMessageLog, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
        try {
            // Insert the initial log entry
            const result = await query(
                `INSERT INTO whatsapp_logs (
                    recipient, message, status, 
                    error, message_type, chat_id,
                    booking_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id`,
                [
                    log.recipient,
                    log.message,
                    log.status,
                    log.error || null,
                    log.message_type,
                    log.chat_id || null,
                    log.booking_id || null  // Include booking_id in initial insert
                ]
            );

            return result.rows[0].id;
        } catch (error) {
            logger.error('Failed to log WhatsApp message:', error);
            throw error;
        }
    }

    private async updateMessageLog(id: string, updates: Partial<WhatsAppMessageLog>): Promise<void> {
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

    async sendMessage(to: string, message: string, bookingId?: string): Promise<any> {
        try {
            // Wait for initialization
            await this.waitForInitialization();

            const phoneNumber = this.validatePhoneNumber(to);

            logger.info('Sending WhatsApp message:', {
                to: phoneNumber,
                messageLength: message.length,
                bookingId
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

            if (response.data?.sent === "true") {
                logger.info('WhatsApp message sent successfully:', {
                    messageId: response.data.id,
                    recipient: phoneNumber,
                    bookingId
                });
                return response.data;
            } else {
                throw new Error(response.data?.message || 'Failed to send message');
            }
        } catch (error) {
            logger.error('Error sending WhatsApp message:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                to,
                bookingId
            });
            throw error;
        }
    }

    async sendBookingConfirmation(
        to: string,
        userName: string,
        vehicleName: string,
        startDate: string,
        bookingId: string
    ): Promise<any> {
        const message = `🎉 Booking Confirmed!\n\n` +
            `Hello ${userName}!\n\n` +
            `Your booking for ${vehicleName} has been confirmed.\n` +
            `Pickup time: ${startDate}\n` +
            `Booking ID: ${bookingId}\n\n` +
            `Thank you for choosing OnnRides! Drive safe! 🚗`;

        return this.sendMessage(to, message, bookingId);
    }

    async sendPaymentConfirmation(
        to: string,
        userName: string,
        amount: string,
        bookingId: string
    ): Promise<any> {
        const message = `💰 Payment Confirmed\n\n` +
            `Hello ${userName},\n\n` +
            `We've received your payment of ₹${amount} for booking ID: ${bookingId}.\n\n` +
            `Thank you for choosing OnnRides! 🙏`;

        return this.sendMessage(to, message, bookingId);
    }

    async sendBookingCancellation(
        to: string,
        userName: string,
        vehicleName: string,
        bookingId?: string
    ): Promise<any> {
        const message = `❌ Booking Cancelled\n\n` +
            `Hello ${userName},\n\n` +
            `Your booking for ${vehicleName} has been cancelled.\n\n` +
            `If you didn't request this cancellation, please contact our support:\n` +
            `📞 Phone: +91 8247494622\n` +
            `📧 Email: support@onnrides.com`;

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