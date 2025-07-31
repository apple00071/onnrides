import logger from '@/lib/logger';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';

interface BookingConfirmationData {
  customerName: string;
  customerPhone: string;
  vehicleType: string;
  vehicleModel: string;
  startDate: string;
  endDate: string;
  bookingId: string;
  totalAmount: string;
}

export class WhatsAppService {
  private static instance: WhatsAppService;
  private messaging: admin.messaging.Messaging;

  private constructor() {
    const app = getFirebaseAdmin();
    this.messaging = app.messaging();
  }

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  public async sendBookingConfirmation(data: BookingConfirmationData): Promise<void> {
    try {
      const message = this.createBookingConfirmationMessage(data);

      // Send message using Firebase Admin
      await this.messaging.send({
        notification: {
          title: 'Booking Confirmation',
          body: message,
        },
        data: {
          type: 'booking_confirmation',
          bookingId: data.bookingId,
        },
        token: data.customerPhone, // Assuming this is the Firebase messaging token
      });

      logger.info(`WhatsApp notification sent successfully to ${data.customerPhone}`);
    } catch (error) {
      logger.error('Error sending WhatsApp notification:', error);
      throw error;
    }
  }

  private createBookingConfirmationMessage(data: BookingConfirmationData): string {
    return `🎉 Booking Confirmed!

Dear ${data.customerName},

Your booking has been confirmed with Go On Riders.

📋 Booking Details:
Booking ID: ${data.bookingId}
Vehicle: ${data.vehicleModel}
Start: ${data.startDate}
End: ${data.endDate}
Amount: ₹${data.totalAmount}

Need help? Contact us at:
📞 +91 1234567890
📧 support@go-onriders.com

Thank you for choosing Go On Riders! 🙏`;
  }
} 