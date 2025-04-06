import logger from '@/lib/logger';

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
  private apiKey: string;
  private apiUrl: string;

  private constructor() {
    this.apiKey = process.env.WHATSAPP_API_KEY || '';
    this.apiUrl = process.env.WHATSAPP_API_URL || '';
  }

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  public async sendBookingConfirmation(data: BookingConfirmationData): Promise<void> {
    try {
      if (!this.apiKey || !this.apiUrl) {
        logger.warn('WhatsApp API credentials not configured');
        return;
      }

      const message = this.createBookingConfirmationMessage(data);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          phone: data.customerPhone,
          message
        })
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API responded with status: ${response.status}`);
      }

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