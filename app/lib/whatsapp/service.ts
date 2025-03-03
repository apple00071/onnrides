import axios from 'axios';
import logger from '@/lib/logger';

// WhatsApp API configuration
const WHATSAPP_API_URL = 'http://34.45.239.220:3001';
const API_KEY = 'onn7r1d3s_wh4ts4pp_ap1_s3cur3_k3y_9872354176';

// Types for WhatsApp messages
interface WhatsAppMessage {
  instanceId: string;
  to: string;
  message: string;
}

interface BookingDetails {
  customerName: string;
  customerPhone: string;
  vehicleType: string;
  vehicleModel: string;
  startDate: string;
  endDate: string;
  bookingId: string;
  totalAmount?: string;
  pickupLocation?: string;
}

export class WhatsAppService {
  private static instance: WhatsAppService;
  private adminPhone: string;

  private constructor() {
    this.adminPhone = process.env.ADMIN_PHONE || '919182495481';
  }

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  // Generic method to send WhatsApp messages
  private async sendMessage(messageData: WhatsAppMessage): Promise<any> {
    try {
      const response = await axios.post(
        `${WHATSAPP_API_URL}/api/send`,
        messageData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY
          }
        }
      );

      logger.info('WhatsApp message sent successfully:', {
        to: messageData.to,
        messageId: response.data?.messageId
      });

      return response.data;
    } catch (error) {
      logger.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }

  // Send booking confirmation to customer and admin
  public async sendBookingConfirmation(booking: BookingDetails): Promise<void> {
    try {
      // Customer message
      const customerMessage = `Thank you for booking with OnnRides! 🛵\n\n` +
        `*Booking Details:*\n` +
        `🚗 Vehicle: ${booking.vehicleType} ${booking.vehicleModel}\n` +
        `📅 Start: ${booking.startDate}\n` +
        `📅 End: ${booking.endDate}\n` +
        `🔖 Booking ID: ${booking.bookingId}\n` +
        (booking.totalAmount ? `💰 Total: ${booking.totalAmount}\n` : '') +
        (booking.pickupLocation ? `📍 Pickup: ${booking.pickupLocation}\n` : '') +
        `\nFor support, call: 8247494622`;

      await this.sendMessage({
        instanceId: 'instance1',
        to: booking.customerPhone,
        message: customerMessage
      });

      // Admin notification
      const adminMessage = `*New Booking Alert!* 🔔\n\n` +
        `👤 Customer: ${booking.customerName}\n` +
        `📞 Phone: ${booking.customerPhone}\n` +
        `🚗 Vehicle: ${booking.vehicleType} ${booking.vehicleModel}\n` +
        `⏰ Duration: ${booking.startDate} to ${booking.endDate}\n` +
        `🔖 Booking ID: ${booking.bookingId}\n` +
        (booking.totalAmount ? `💰 Amount: ${booking.totalAmount}\n` : '') +
        (booking.pickupLocation ? `📍 Location: ${booking.pickupLocation}` : '');

      await this.sendMessage({
        instanceId: 'instance2',
        to: this.adminPhone,
        message: adminMessage
      });

    } catch (error) {
      logger.error('Error sending booking confirmation via WhatsApp:', error);
      throw error;
    }
  }

  // Send booking cancellation notification
  public async sendBookingCancellation(
    phone: string,
    customerName: string,
    vehicleName: string,
    bookingId: string
  ): Promise<void> {
    try {
      const message = `Hello ${customerName},\n\n` +
        `Your booking has been cancelled.\n\n` +
        `*Booking Details:*\n` +
        `🔖 Booking ID: ${bookingId}\n` +
        `🚗 Vehicle: ${vehicleName}\n\n` +
        `If you didn't request this cancellation, please contact us:\n` +
        `📞 8247494622\n` +
        `📧 support@onnrides.com`;

      await this.sendMessage({
        instanceId: 'instance1',
        to: phone,
        message
      });

    } catch (error) {
      logger.error('Error sending cancellation notification via WhatsApp:', error);
      throw error;
    }
  }

  // Send payment confirmation
  public async sendPaymentConfirmation(
    phone: string,
    customerName: string,
    bookingId: string,
    amount: string
  ): Promise<void> {
    try {
      const message = `Hello ${customerName},\n\n` +
        `Your payment has been received! 🎉\n\n` +
        `*Payment Details:*\n` +
        `🔖 Booking ID: ${bookingId}\n` +
        `💰 Amount: ${amount}\n\n` +
        `Thank you for choosing OnnRides! 🙏`;

      await this.sendMessage({
        instanceId: 'instance1',
        to: phone,
        message
      });

    } catch (error) {
      logger.error('Error sending payment confirmation via WhatsApp:', error);
      throw error;
    }
  }
} 