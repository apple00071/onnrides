import { prisma } from '../prisma';
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
   * Send pickup reminders for bookings starting in 24 hours
   */
  async sendPickupReminders(): Promise<void> {
    try {
      logger.info('Starting pickup reminder check...');

      // Get bookings that start in approximately 24 hours (23-25 hours from now)
      const tomorrow = new Date();
      tomorrow.setHours(tomorrow.getHours() + 23);
      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setHours(dayAfterTomorrow.getHours() + 25);

      const bookings = await prisma.booking.findMany({
        where: {
          start_date: {
            gte: tomorrow,
            lte: dayAfterTomorrow
          },
          status: {
            in: ['confirmed', 'active', 'pending']
          },
          phone_number: {
            not: null
          }
        },
        include: {
          vehicle: true
        }
      });

      logger.info(`Found ${bookings.length} bookings for pickup reminders`);

      for (const booking of bookings) {
        try {
          // Check if reminder was already sent
          const existingReminder = await prisma.whatsAppLog.findFirst({
            where: {
              recipient: booking.phone_number!,
              message: {
                contains: `[PICKUP_REMINDER]`
              },
              created_at: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
              }
            }
          });

          if (existingReminder) {
            logger.info(`Pickup reminder already sent for booking ${booking.booking_id}`);
            continue;
          }

          const bookingData = {
            id: booking.id,
            booking_id: booking.booking_id,
            customer_name: booking.customer_name,
            phone_number: booking.phone_number,
            email: booking.email,
            vehicle_model: booking.vehicle?.name || booking.vehicle_model,
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
          
          // Add a small delay between messages to avoid rate limiting
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
   * Send return reminders for bookings ending in 24 hours
   */
  async sendReturnReminders(): Promise<void> {
    try {
      logger.info('Starting return reminder check...');

      // Get bookings that end in approximately 24 hours (23-25 hours from now)
      const tomorrow = new Date();
      tomorrow.setHours(tomorrow.getHours() + 23);
      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setHours(dayAfterTomorrow.getHours() + 25);

      const bookings = await prisma.booking.findMany({
        where: {
          end_date: {
            gte: tomorrow,
            lte: dayAfterTomorrow
          },
          status: {
            in: ['initiated', 'active', 'ongoing']
          },
          phone_number: {
            not: null
          }
        },
        include: {
          vehicle: true
        }
      });

      logger.info(`Found ${bookings.length} bookings for return reminders`);

      for (const booking of bookings) {
        try {
          // Check if reminder was already sent
          const existingReminder = await prisma.whatsAppLog.findFirst({
            where: {
              recipient: booking.phone_number!,
              message: {
                contains: `[RETURN_REMINDER]`
              },
              created_at: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
              }
            }
          });

          if (existingReminder) {
            logger.info(`Return reminder already sent for booking ${booking.booking_id}`);
            continue;
          }

          const bookingData = {
            id: booking.id,
            booking_id: booking.booking_id,
            customer_name: booking.customer_name,
            phone_number: booking.phone_number,
            email: booking.email,
            vehicle_model: booking.vehicle?.name || booking.vehicle_model,
            registration_number: booking.registration_number,
            start_date: booking.start_date,
            end_date: booking.end_date,
            total_amount: Number(booking.total_price),
            pickup_location: typeof booking.pickup_location === 'string' 
              ? booking.pickup_location 
              : JSON.stringify(booking.pickup_location),
            status: booking.status
          };

          await this.notificationService.sendReturnReminder(bookingData);
          
          // Add a small delay between messages to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          logger.error(`Error sending return reminder for booking ${booking.booking_id}:`, error);
        }
      }

      logger.info('Return reminder check completed');
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
