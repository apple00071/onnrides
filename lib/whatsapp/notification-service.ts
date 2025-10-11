import { WaSenderService } from './wasender-service';
import { prisma } from '../prisma';
import { formatIST } from '../utils/time-formatter';

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

export interface BookingData {
  id: string;
  booking_id: string;
  customer_name?: string;
  phone_number?: string;
  email?: string;
  vehicle_model?: string;
  registration_number?: string;
  start_date: Date;
  end_date: Date;
  total_amount: number;
  pickup_location?: string;
  status: string;
}

export interface PaymentData {
  booking_id: string;
  payment_id: string;
  amount: number;
  customer_name?: string;
  phone_number?: string;
}

export interface TripInitiationData {
  booking_id: string;
  customer_name?: string;
  customer_phone?: string;
  vehicle_number?: string;
  emergency_contact?: string;
  emergency_name?: string;
}

export class WhatsAppNotificationService {
  private static instance: WhatsAppNotificationService;
  private wasenderService: WaSenderService;

  private constructor() {
    this.wasenderService = WaSenderService.getInstance();
  }

  public static getInstance(): WhatsAppNotificationService {
    if (!WhatsAppNotificationService.instance) {
      WhatsAppNotificationService.instance = new WhatsAppNotificationService();
    }
    return WhatsAppNotificationService.instance;
  }

  /**
   * Send booking confirmation message after successful payment
   */
  async sendBookingConfirmation(bookingData: BookingData): Promise<boolean> {
    try {
      if (!bookingData.phone_number) {
        logger.warn('No phone number provided for booking confirmation', { bookingId: bookingData.booking_id });
        return false;
      }

      const message = `🎉 *Booking Confirmed!*

Dear ${bookingData.customer_name || 'Customer'},

Your booking has been confirmed successfully!

📋 *Booking Details:*
• Booking ID: ${bookingData.booking_id}
• Vehicle: ${bookingData.vehicle_model}${bookingData.registration_number ? ` (${bookingData.registration_number})` : ''}
• Pickup Date: ${formatIST(bookingData.start_date)}
• Return Date: ${formatIST(bookingData.end_date)}
• Total Amount: ₹${bookingData.total_amount}
${bookingData.pickup_location ? `• Pickup Location: ${bookingData.pickup_location}` : ''}

📋 *Documents Required:*
• Valid Driving License
• Aadhar Card
• Original documents for verification

📞 *Contact Us:*
For any queries: +91 8309031203
Email: contact@onnrides.com

Thank you for choosing OnnRides! 🚗`;

      const result = await this.wasenderService.sendTextMessage(bookingData.phone_number, message);
      
      if (result) {
        await this.logWhatsAppMessage(bookingData.phone_number, message, 'booking_confirmation', 'delivered');
        logger.info('Booking confirmation WhatsApp sent', { bookingId: bookingData.booking_id });
      } else {
        await this.logWhatsAppMessage(bookingData.phone_number, message, 'booking_confirmation', 'failed');
      }
      
      return result;
    } catch (error) {
      logger.error('Error sending booking confirmation WhatsApp:', error);
      return false;
    }
  }

  /**
   * Send payment success confirmation
   */
  async sendPaymentConfirmation(paymentData: PaymentData): Promise<boolean> {
    try {
      if (!paymentData.phone_number) {
        logger.warn('No phone number provided for payment confirmation', { bookingId: paymentData.booking_id });
        return false;
      }

      const message = `💳 *Payment Successful!*

Dear ${paymentData.customer_name || 'Customer'},

Your payment has been processed successfully!

💰 *Payment Details:*
• Booking ID: ${paymentData.booking_id}
• Amount Paid: ₹${paymentData.amount}
• Payment ID: ${paymentData.payment_id}
• Status: Confirmed ✅

Your booking is now confirmed and active. You will receive pickup details shortly.

📞 *Contact Us:*
For any queries: +91 8309031203
Email: contact@onnrides.com

Thank you for choosing OnnRides! 🚗`;

      const result = await this.wasenderService.sendTextMessage(paymentData.phone_number, message);
      
      if (result) {
        await this.logWhatsAppMessage(paymentData.phone_number, message, 'payment_confirmation', 'delivered');
        logger.info('Payment confirmation WhatsApp sent', { bookingId: paymentData.booking_id });
      } else {
        await this.logWhatsAppMessage(paymentData.phone_number, message, 'payment_confirmation', 'failed');
      }
      
      return result;
    } catch (error) {
      logger.error('Error sending payment confirmation WhatsApp:', error);
      return false;
    }
  }

  /**
   * Send pickup reminder 24 hours before scheduled pickup
   */
  async sendPickupReminder(bookingData: BookingData): Promise<boolean> {
    try {
      if (!bookingData.phone_number) {
        logger.warn('No phone number provided for pickup reminder', { bookingId: bookingData.booking_id });
        return false;
      }

      const message = `⏰ *Pickup Reminder*

Dear ${bookingData.customer_name || 'Customer'},

This is a reminder for your upcoming vehicle pickup tomorrow!

📋 *Booking Details:*
• Booking ID: ${bookingData.booking_id}
• Vehicle: ${bookingData.vehicle_model}
• Pickup Date: ${formatIST(bookingData.start_date)}
• Return Date: ${formatIST(bookingData.end_date)}
${bookingData.pickup_location ? `• Pickup Location: ${bookingData.pickup_location}` : ''}

📋 *Please Bring:*
• Valid Driving License (Original)
• Aadhar Card (Original)
• Any additional documents as requested

⚠️ *Important:*
Please arrive 15 minutes before your scheduled pickup time.

📞 *Contact Us:*
For any queries: +91 8309031203
Email: contact@onnrides.com

See you tomorrow! 🚗`;

      const result = await this.wasenderService.sendTextMessage(bookingData.phone_number, message);
      
      if (result) {
        await this.logWhatsAppMessage(bookingData.phone_number, message, 'pickup_reminder', 'delivered');
        logger.info('Pickup reminder WhatsApp sent', { bookingId: bookingData.booking_id });
      } else {
        await this.logWhatsAppMessage(bookingData.phone_number, message, 'pickup_reminder', 'failed');
      }
      
      return result;
    } catch (error) {
      logger.error('Error sending pickup reminder WhatsApp:', error);
      return false;
    }
  }

  /**
   * Send trip start confirmation when vehicle is handed over
   */
  async sendTripStartConfirmation(tripData: TripInitiationData): Promise<boolean> {
    try {
      if (!tripData.customer_phone) {
        logger.warn('No phone number provided for trip start confirmation', { bookingId: tripData.booking_id });
        return false;
      }

      const message = `🚗 *Trip Started!*

Dear ${tripData.customer_name || 'Customer'},

Your vehicle has been successfully handed over!

📋 *Trip Details:*
• Booking ID: ${tripData.booking_id}
${tripData.vehicle_number ? `• Vehicle Number: ${tripData.vehicle_number}` : ''}
• Trip Start Time: ${formatIST(new Date())}

🆘 *Emergency Contact:*
${tripData.emergency_name ? `• Name: ${tripData.emergency_name}` : ''}
${tripData.emergency_contact ? `• Phone: ${tripData.emergency_contact}` : ''}

⚠️ *Important Reminders:*
• Drive safely and follow traffic rules
• Return the vehicle on time
• Report any issues immediately
• Keep all documents with you

📞 *24/7 Support:*
Emergency: +91 8309031203
Email: contact@onnrides.com

Have a safe journey! 🛣️`;

      const result = await this.wasenderService.sendTextMessage(tripData.customer_phone, message);
      
      if (result) {
        await this.logWhatsAppMessage(tripData.customer_phone, message, 'trip_start', 'delivered');
        logger.info('Trip start confirmation WhatsApp sent', { bookingId: tripData.booking_id });
      } else {
        await this.logWhatsAppMessage(tripData.customer_phone, message, 'trip_start', 'failed');
      }
      
      return result;
    } catch (error) {
      logger.error('Error sending trip start confirmation WhatsApp:', error);
      return false;
    }
  }

  /**
   * Send return reminder 24 hours before scheduled return
   */
  async sendReturnReminder(bookingData: BookingData): Promise<boolean> {
    try {
      if (!bookingData.phone_number) {
        logger.warn('No phone number provided for return reminder', { bookingId: bookingData.booking_id });
        return false;
      }

      const message = `🔄 *Return Reminder*

Dear ${bookingData.customer_name || 'Customer'},

This is a reminder that your vehicle return is due tomorrow!

📋 *Return Details:*
• Booking ID: ${bookingData.booking_id}
• Vehicle: ${bookingData.vehicle_model}
• Return Date: ${formatIST(bookingData.end_date)}
${bookingData.pickup_location ? `• Return Location: ${bookingData.pickup_location}` : ''}

✅ *Before Return Checklist:*
• Fill fuel tank to the same level as received
• Clean the vehicle (interior & exterior)
• Check for any damages and report immediately
• Bring all documents and keys
• Remove all personal belongings

⚠️ *Important:*
Late returns may incur additional charges.

📞 *Contact Us:*
For any queries: +91 8309031203
Email: contact@onnrides.com

Thank you for choosing OnnRides! 🚗`;

      const result = await this.wasenderService.sendTextMessage(bookingData.phone_number, message);
      
      if (result) {
        await this.logWhatsAppMessage(bookingData.phone_number, message, 'return_reminder', 'delivered');
        logger.info('Return reminder WhatsApp sent', { bookingId: bookingData.booking_id });
      } else {
        await this.logWhatsAppMessage(bookingData.phone_number, message, 'return_reminder', 'failed');
      }
      
      return result;
    } catch (error) {
      logger.error('Error sending return reminder WhatsApp:', error);
      return false;
    }
  }

  /**
   * Send offline booking confirmation
   */
  async sendOfflineBookingConfirmation(bookingData: BookingData): Promise<boolean> {
    try {
      if (!bookingData.phone_number) {
        logger.warn('No phone number provided for offline booking confirmation', { bookingId: bookingData.booking_id });
        return false;
      }

      const message = `📝 *Offline Booking Confirmed!*

Dear ${bookingData.customer_name || 'Customer'},

Your offline booking has been successfully created!

📋 *Booking Details:*
• Booking ID: ${bookingData.booking_id}
• Vehicle: ${bookingData.vehicle_model}${bookingData.registration_number ? ` (${bookingData.registration_number})` : ''}
• Start Date: ${formatIST(bookingData.start_date)}
• End Date: ${formatIST(bookingData.end_date)}
• Total Amount: ₹${bookingData.total_amount}
• Status: ${bookingData.status}

✅ *Next Steps:*
• Complete any pending documentation
• Ensure all payments are settled
• Be ready for vehicle handover

📞 *Contact Us:*
For any queries: +91 8309031203
Email: contact@onnrides.com

Thank you for choosing OnnRides! 🚗`;

      const result = await this.wasenderService.sendTextMessage(bookingData.phone_number, message);
      
      if (result) {
        await this.logWhatsAppMessage(bookingData.phone_number, message, 'offline_booking', 'delivered');
        logger.info('Offline booking confirmation WhatsApp sent', { bookingId: bookingData.booking_id });
      } else {
        await this.logWhatsAppMessage(bookingData.phone_number, message, 'offline_booking', 'failed');
      }
      
      return result;
    } catch (error) {
      logger.error('Error sending offline booking confirmation WhatsApp:', error);
      return false;
    }
  }

  /**
   * Log WhatsApp message to database
   */
  private async logWhatsAppMessage(
    recipient: string,
    message: string,
    type: string,
    status: 'delivered' | 'failed',
    error?: string
  ): Promise<void> {
    try {
      await prisma.whatsAppLog.create({
        data: {
          recipient,
          message: `[${type.toUpperCase()}] ${message}`,
          status,
          error: error || null
        }
      });
    } catch (logError) {
      logger.error('Error logging WhatsApp message:', logError);
    }
  }
}
