import { sendWhatsAppMessage } from './ultramsg';
import logger from './logger';
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

interface InitializationStatus {
    isInitialized: boolean;
    error?: Error;
}

export class WhatsAppService {
    private static instance: WhatsAppService;
    private db: Database.Database;

    private constructor() {
        // Initialize SQLite database
        const dbPath = path.join(process.cwd(), 'data', 'whatsapp.db');
        this.db = new Database(dbPath);
        
        // Create tables if they don't exist
        this.initializeDatabase();
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

        // Create indices
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_recipient ON whatsapp_logs(recipient);
            CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON whatsapp_logs(status);
            CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_booking_id ON whatsapp_logs(booking_id);
        `);
    }

    public static getInstance(): WhatsAppService {
        if (!WhatsAppService.instance) {
            WhatsAppService.instance = new WhatsAppService();
        }
        return WhatsAppService.instance;
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

    public async sendMessage(to: string, message: string, bookingId?: string): Promise<boolean> {
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

            // Send message using UltraMsg
            const success = await sendWhatsAppMessage(to, message);
            
            if (success) {
                await this.updateMessageLog(logId, {
                    status: 'success'
                });
                return true;
            } else {
                await this.updateMessageLog(logId, {
                    status: 'failed',
                    error: 'Failed to send message'
                });
                return false;
            }
        } catch (error) {
            logger.error('Error sending WhatsApp message:', error);
            
            if (logId) {
                await this.updateMessageLog(logId, {
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
            
            return false;
        }
    }

    public async sendBookingConfirmation(
        phone: string,
        userName: string,
        vehicleDetails: string,
        location: string,
        pickupDateTime: string,
        dropoffDateTime: string,
        bookingId?: string
    ): Promise<boolean> {
        try {
            const message = `Hello ${userName}! 👋\n\nYour booking has been confirmed ✅\n\nVehicle: ${vehicleDetails}\n📍 Location: ${location}\n\n📅 Pickup: ${pickupDateTime}\n📅 Drop-off: ${dropoffDateTime}\n\nThank you for choosing OnnRides! 🙏\n\nNeed help? Contact us:\n📞 +91 83090 31203\n📧 contact@onnrides.com`;
            return await this.sendMessage(phone, message, bookingId);
        } catch (error) {
            logger.error('Failed to send booking confirmation:', error);
            return false;
        }
    }

    public async sendBookingCancellation(
        phone: string,
        userName: string,
        vehicleDetails: string,
        location: string,
        bookingId?: string
    ): Promise<boolean> {
        try {
            const message = `Hello ${userName}! ⚠️\n\nYour booking for ${vehicleDetails} at ${location} has been cancelled.\n\nWe hope to serve you again soon!\n\nNeed assistance?\n📞 +91 83090 31203\n📧 contact@onnrides.com`;
            return await this.sendMessage(phone, message, bookingId);
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
            const message = `Hello ${userName}! 👋\n\nYour payment of ₹${amount} has been received ✅\nBooking ID: ${bookingId}\n\nThank you for choosing OnnRides! 🙏\n\nNeed help? Contact us:\n📞 +91 83090 31203\n📧 contact@onnrides.com`;
            return await this.sendMessage(phone, message, bookingId);
        } catch (error) {
            logger.error('Failed to send payment confirmation:', error);
            return false;
        }
    }

    public async sendBookingReminder(
        phone: string,
        userName: string,
        vehicleDetails: string,
        location: string,
        pickupDateTime: string,
        dropoffDateTime: string,
        bookingId?: string
    ): Promise<boolean> {
        try {
            const message = `Hello ${userName}! 👋\n\nReminder: Your upcoming booking 🔔\n\nVehicle: ${vehicleDetails}\n📍 Location: ${location}\n\n📅 Pickup: ${pickupDateTime}\n📅 Drop-off: ${dropoffDateTime}\n\nWe're looking forward to serving you!\n\nNeed assistance?\n📞 +91 83090 31203\n📧 contact@onnrides.com`;
            return await this.sendMessage(phone, message, bookingId);
        } catch (error) {
            logger.error('Failed to send booking reminder:', error);
            return false;
        }
    }
} 