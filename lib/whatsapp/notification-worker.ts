import { query } from '@/lib/db';
import { WaSenderService } from './wasender-service';
import logger from '@/lib/logger';

interface NotificationQueueItem {
    id: string;
    type: string;
    recipient: string;
    data: any;
    status: string;
    retry_count: number;
    next_retry_at: Date | null;
}

export class NotificationWorker {
    private waSender: WaSenderService;
    private isProcessing: boolean = false;
    private processInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.waSender = WaSenderService.getInstance();
    }

    public start() {
        // Process queue every minute
        this.processInterval = setInterval(() => this.processQueue(), 60000);
        logger.info('Notification worker started');
    }

    public stop() {
        if (this.processInterval) {
            clearInterval(this.processInterval);
            this.processInterval = null;
        }
        logger.info('Notification worker stopped');
    }

    private async processQueue() {
        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        try {
            // Get pending notifications
            const result = await query(
                `SELECT * FROM notification_queue 
                 WHERE status = 'pending' 
                 AND (next_retry_at IS NULL OR next_retry_at <= NOW())
                 ORDER BY created_at ASC 
                 LIMIT 10`
            );

            for (const notification of result.rows) {
                await this.processNotification(notification);
            }
        } catch (error) {
            logger.error('Error processing notification queue:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    private async processNotification(notification: NotificationQueueItem) {
        try {
            switch (notification.type) {
                case 'whatsapp_booking_confirmation':
                    await this.processBookingConfirmation(notification);
                    break;
                default:
                    logger.error('Unknown notification type:', notification.type);
                    await this.markNotificationFailed(notification.id, `Unknown notification type: ${notification.type}`);
            }
        } catch (error) {
            logger.error('Error processing notification:', {
                notificationId: notification.id,
                error
            });
            await this.handleNotificationError(notification, error);
        }
    }

    private async processBookingConfirmation(notification: NotificationQueueItem) {
        const { userName, vehicleName, startDate, bookingId } = notification.data;

        await this.waSender.sendTextMessage(
            notification.recipient,
            `🎉 Booking Confirmed!\n\n` +
            `Hello ${userName}!\n\n` +
            `Your booking for ${vehicleName} has been confirmed.\n` +
            `Pickup time: ${startDate}\n` +
            `Booking ID: ${bookingId}\n\n` +
            `Thank you for choosing OnnRides! Drive safe! 🚗`
        );

        await this.markNotificationCompleted(notification.id);
    }

    private async markNotificationCompleted(id: string) {
        await query(
            `UPDATE notification_queue 
             SET status = 'completed', 
                 updated_at = NOW() 
             WHERE id = $1`,
            [id]
        );
    }

    private async markNotificationFailed(id: string, error: string) {
        await query(
            `UPDATE notification_queue 
             SET status = 'failed', 
                 updated_at = NOW(),
                 error = $2
             WHERE id = $1`,
            [id, error]
        );
    }

    private async handleNotificationError(notification: NotificationQueueItem, error: any) {
        const maxRetries = 3;
        const backoffMinutes = Math.pow(2, notification.retry_count); // Exponential backoff

        if (notification.retry_count < maxRetries) {
            // Schedule retry
            await query(
                `UPDATE notification_queue 
                 SET retry_count = retry_count + 1,
                     next_retry_at = NOW() + interval '${backoffMinutes} minutes',
                     error = $2
                 WHERE id = $1`,
                [notification.id, error instanceof Error ? error.message : 'Unknown error']
            );
        } else {
            // Mark as failed after max retries
            await this.markNotificationFailed(
                notification.id,
                `Max retries exceeded. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }
} 