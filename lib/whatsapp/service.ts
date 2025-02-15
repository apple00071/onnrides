import logger from '@/lib/logger';
import { Client } from 'whatsapp-web.js';
import { initializeWhatsAppClient } from './config';
import Database from 'better-sqlite3';
import path from 'path';

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

interface RateLimitRecord {
    count: number;
    reset_time: number;
}

export class WhatsAppService {
    private static instance: WhatsAppService;
    private client: Client | null = null;
    private initializationError: Error | null = null;
    private db: Database.Database;
    
    // Rate limiting properties
    private rateLimits: Map<string, RateLimitEntry> = new Map();
    private readonly rateLimitConfig: RateLimitConfig = {
        windowMs: 60000,  // 1 minute
        maxRequests: 30   // 30 requests per minute
    };

    private constructor() {
        // Initialize SQLite database
        const dbPath = path.join(process.cwd(), 'whatsapp.db');
        this.db = new Database(dbPath);
        
        // Create tables if they don't exist
        this.initializeDatabase();
        this.initializeClient();
    }

    private initializeDatabase() {
        // Create messages table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS whatsapp_logs (
                id TEXT PRIMARY KEY,
                recipient TEXT NOT NULL,
                message TEXT NOT NULL,
                booking_id TEXT,
                status TEXT NOT NULL,
                error TEXT,
                message_type TEXT NOT NULL,
                chat_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        `);

        // Create rate_limits table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS rate_limits (
                phone TEXT PRIMARY KEY,
                count INTEGER NOT NULL,
                reset_time INTEGER NOT NULL
            )
        `);

        // Create indices
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_recipient ON whatsapp_logs(recipient);
            CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON whatsapp_logs(status);
            CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_booking_id ON whatsapp_logs(booking_id);
        `);
    }

    private async initializeClient() {
        try {
            this.client = await initializeWhatsAppClient();
            if (!this.client) {
                throw new Error('Failed to initialize WhatsApp client');
            }
        } catch (error) {
            this.initializationError = error instanceof Error ? error : new Error('Unknown initialization error');
            logger.error('WhatsApp client initialization failed:', error);
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
            isInitialized: !!this.client?.info,
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
            const now = new Date().toISOString();

            const stmt = this.db.prepare(`
                INSERT INTO whatsapp_logs (
                    id, recipient, message, booking_id, status, 
                    error, message_type, chat_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                id,
                log.recipient,
                log.message,
                log.booking_id || null,
                log.status,
                log.error || null,
                log.message_type,
                log.chat_id || null,
                now,
                now
            );

            return id;
        } catch (error) {
            logger.error('Failed to log WhatsApp message:', error);
            throw error;
        }
    }

    private async updateMessageLog(id: string, updates: Partial<WhatsAppLog>): Promise<void> {
        try {
            const now = new Date().toISOString();
            const setClauses = Object.entries(updates)
                .map(([key]) => `${key} = ?`)
                .concat(['updated_at = ?'])
                .join(', ');

            const stmt = this.db.prepare(`
                UPDATE whatsapp_logs 
                SET ${setClauses}
                WHERE id = ?
            `);

            stmt.run(
                ...Object.values(updates),
                now,
                id
            );
        } catch (error) {
            logger.error('Failed to update WhatsApp message log:', error);
        }
    }

    private checkRateLimit(phoneNumber: string): boolean {
        const now = Date.now();

        // Clean up old rate limits
        this.db.prepare(`
            DELETE FROM rate_limits 
            WHERE reset_time < ?
        `).run(now);

        // Get current rate limit
        const rateLimit = this.db.prepare(`
            SELECT count, reset_time 
            FROM rate_limits 
            WHERE phone = ?
        `).get(phoneNumber) as RateLimitRecord | undefined;

        if (!rateLimit) {
            // Create new rate limit
            this.db.prepare(`
                INSERT INTO rate_limits (phone, count, reset_time)
                VALUES (?, 1, ?)
            `).run(phoneNumber, now + this.rateLimitConfig.windowMs);
            return true;
        }

        if (rateLimit.count >= this.rateLimitConfig.maxRequests) {
            return false;
        }

        // Increment count
        this.db.prepare(`
            UPDATE rate_limits 
            SET count = count + 1
            WHERE phone = ?
        `).run(phoneNumber);

        return true;
    }

    public async sendMessage(to: string, message: string, bookingId?: string): Promise<void> {
        if (!this.client?.info) {
            throw new Error('WhatsApp client not initialized');
        }

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

        try {
            // Log the pending message
            logId = await this.logMessage({
                recipient: to,
                message,
                booking_id: bookingId,
                status: 'pending',
                message_type: 'text'
            });

            const formattedNumber = this.validatePhoneNumber(to);
            const chat = await this.client.getChatById(formattedNumber + '@c.us');
            const result = await chat.sendMessage(message);
            
            await this.updateMessageLog(logId, {
                status: 'success',
                chat_id: result.id._serialized
            });

            logger.info('WhatsApp message sent successfully', {
                to: formattedNumber,
                messageId: result.id._serialized,
                bookingId
            });
        } catch (error) {
            logger.error('Failed to send WhatsApp message:', error);
            
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