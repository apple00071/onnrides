import { query } from '../db';
import { WhatsAppNotificationService } from './notification-service';

// Simple logger for the service
const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${message}`, meta || '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${message}`, meta || '');
  },
  error: (message: string, meta?: any) => {
    console.error(`[ERROR] ${message}`, meta || '');
  }
};

export class WhatsAppReminderService {
  private static instance: WhatsAppReminderService;
  private notificationService: WhatsAppNotificationService;

  private constructor() {
    this.notificationService = WhatsAppNotificationService.getInstance();
  }

  public static getInstance(): WhatsAppReminderService {
    if (!WhatsAppReminderService.instance) {
      WhatsAppReminderService.instance = new WhatsAppReminderService();
    }
    return WhatsAppReminderService.instance;
  }

  /**
   * Send pickup reminders for bookings starting in 2 hours
   */
  async sendPickupReminders(): Promise<void> {
    try {
      logger.info('Starting pickup reminder check...');

      // Get bookings that start in approximately 2 hours
      const result = await query(`
        SELECT 
          b.*,
          v.name as vehicle_name
        FROM bookings b
        LEFT JOIN vehicles v ON b.vehicle_id = v.id
        WHERE b.start_date >= (NOW() AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 hour 45 minutes'
        AND b.start_date <= (NOW() AT TIME ZONE 'Asia/Kolkata') + INTERVAL '2 hours 15 minutes'
        AND b.status IN ('confirmed', 'active', 'pending')
        AND b.phone_number IS NOT NULL
      `);

      const bookings = result.rows;

      logger.info(`Found ${bookings.length} bookings for pickup reminders`);

      for (const booking of bookings) {
        try {
          // Check if reminder was already sent
          const logResult = await query(`
            SELECT id FROM whatsapp_logs
            WHERE recipient = $1
            AND message LIKE '%[PICKUP_REMINDER_2H]%'
            AND created_at >= (NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '24 hours'
            LIMIT 1
          `, [booking.phone_number]);

          if (logResult.rows.length > 0) {
            logger.info(`Pickup reminder already sent for booking ${booking.booking_id}`);
            continue;
          }

          const bookingData = {
            id: booking.id,
            booking_id: booking.booking_id,
            customer_name: booking.customer_name,
            phone_number: booking.phone_number,
            email: booking.email,
            vehicle_model: booking.vehicle_name || booking.vehicle_model,
            registration_number: booking.registration_number,
            start_date: booking.start_date,
            end_date: booking.end_date,
            total_amount: Number(booking.total_price),
            pickup_location: typeof booking.pickup_location === 'string'
              ? booking.pickup_location
              : JSON.stringify(booking.pickup_location),
            status: booking.status
          };

          await this.notificationService.sendPickupReminder(bookingData);

          // Add a small delay between messages
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          logger.error(`Error sending pickup reminder for booking ${booking.booking_id}:`, error);
        }
      }

      logger.info('Pickup reminder check completed');
    } catch (error) {
      logger.error('Error in sendPickupReminders:', error);
    }
  }

  /**
   * Send return reminders for bookings ending in 2h and 30m windows
   */
  async sendReturnReminders(): Promise<void> {
    try {
      logger.info('Starting return reminder checks...');

      const windows = [
        {
          label: '2h',
          minTime: '1 hour 45 minutes',
          maxTime: '2 hours 15 minutes',
          tag: 'RETURN_REMINDER_2H'
        },
        {
          label: '30m',
          minTime: '15 minutes',
          maxTime: '45 minutes',
          tag: 'RETURN_REMINDER_30M'
        }
      ];

      for (const window of windows) {
        logger.info(`Checking ${window.label} return reminders...`);

        const result = await query(`
          SELECT 
            b.*,
            v.name as vehicle_name
          FROM bookings b
          LEFT JOIN vehicles v ON b.vehicle_id = v.id
          WHERE b.end_date >= (NOW() AT TIME ZONE 'Asia/Kolkata') + $1::interval
          AND b.end_date <= (NOW() AT TIME ZONE 'Asia/Kolkata') + $2::interval
          AND b.status IN ('initiated', 'active', 'ongoing')
          AND b.phone_number IS NOT NULL
        `, [window.minTime, window.maxTime]);

        const bookings = result.rows;
        logger.info(`Found ${bookings.length} bookings for ${window.label} return reminders`);

        for (const booking of bookings) {
          try {
            const logResult = await query(`
              SELECT id FROM whatsapp_logs
              WHERE recipient = $1
              AND message LIKE $2
              AND created_at >= (NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '24 hours'
              LIMIT 1
            `, [booking.phone_number, `%[${window.tag}]%`]);

            if (logResult.rows.length > 0) {
              logger.info(`${window.label} return reminder already sent for booking ${booking.booking_id}`);
              continue;
            }

            const bookingData = {
              id: booking.id,
              booking_id: booking.booking_id,
              customer_name: booking.customer_name,
              phone_number: booking.phone_number,
              email: booking.email,
              vehicle_model: booking.vehicle_name || booking.vehicle_model,
              registration_number: booking.registration_number,
              start_date: booking.start_date,
              end_date: booking.end_date,
              total_amount: Number(booking.total_price),
              pickup_location: typeof booking.pickup_location === 'string'
                ? booking.pickup_location
                : JSON.stringify(booking.pickup_location),
              status: booking.status,
              reminder_type: window.tag.toLowerCase()
            };

            await this.notificationService.sendReturnReminder(bookingData);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            logger.error(`Error sending ${window.label} return reminder for booking ${booking.booking_id}:`, error);
          }
        }
      }

      logger.info('Return reminder checks completed');
    } catch (error) {
      logger.error('Error in sendReturnReminders:', error);
    }
  }

  /**
   * Run all reminder checks
   */
  async runAllReminders(): Promise<void> {
    logger.info('Starting all reminder checks...');

    try {
      await this.sendPickupReminders();
      await this.sendReturnReminders();
      logger.info('All reminder checks completed successfully');
    } catch (error) {
      logger.error('Error running all reminders:', error);
    }
  }
}
