import axios from 'axios';
import logger from '@/lib/logger';
import { query } from '@/lib/db';

// WhatsApp API configuration
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'http://34.45.239.220:3001';
const API_KEY = process.env.WHATSAPP_API_KEY || 'onn7r1d3s_wh4ts4pp_ap1_s3cur3_k3y_9872354176';

// Default instance IDs
const CUSTOMER_INSTANCE = 'instance1';  // Instance for customer messages
const ADMIN_INSTANCE = 'instance2';      // Instance for admin notifications

// API endpoints with fallbacks
const ENDPOINTS = {
  SEND: ['/whatsapp/send'],
  STATUS: '/whatsapp/status',
  INSTANCE: (id: string) => `/whatsapp/instance/${id}`,
  CHATS: (id: string) => `/whatsapp/chats/${id}`
};

// Types for WhatsApp messages
interface WhatsAppMessage {
  instanceId: string;
  to: string;
  message: string;
  type?: string;
  metadata?: Record<string, any>;
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
  private customerInstance: string;
  private adminInstance: string;

  private constructor() {
    this.adminPhone = process.env.ADMIN_PHONE || '919182495481';
    this.customerInstance = process.env.WHATSAPP_INSTANCE_ID_1 || CUSTOMER_INSTANCE;
    this.adminInstance = process.env.WHATSAPP_INSTANCE_ID_2 || ADMIN_INSTANCE;
  }

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      // Check API status
      const isApiAvailable = await this.checkApiStatus();
      if (!isApiAvailable) {
        throw new Error('WhatsApp API is not available');
      }

      logger.info('WhatsApp service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize WhatsApp service:', error);
      throw error;
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters and ensure it starts with country code
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
  }

  // Check API status
  private async checkApiStatus(): Promise<boolean> {
    try {
      logger.info('Checking WhatsApp API status...', {
        url: `${WHATSAPP_API_URL}${ENDPOINTS.STATUS}`,
        hasApiKey: !!API_KEY
      });
      
      // First try the status endpoint
      try {
        const response = await axios.get(
          `${WHATSAPP_API_URL}${ENDPOINTS.STATUS}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': API_KEY
            }
          }
        );

        logger.info('WhatsApp API status response:', {
          status: response.status,
          data: response.data,
          success: response.data?.success,
          message: response.data?.message
        });

        // Check if the response indicates success
        return response.data?.success === true || response.status === 200;
      } catch (statusError) {
        logger.warn('Failed to check status endpoint, trying root endpoint...', {
          error: statusError instanceof Error ? statusError.message : 'Unknown error'
        });

        // If status endpoint fails, try the root endpoint
        const rootResponse = await axios.get(
          WHATSAPP_API_URL,
          {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': API_KEY
            }
          }
        );

        logger.info('WhatsApp API root endpoint response:', {
          status: rootResponse.status,
          data: rootResponse.data
        });

        // Check if the server is at least online
        return rootResponse.data?.status === 'online' || rootResponse.status === 200;
      }
    } catch (error) {
      const axiosError = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Error checking WhatsApp API status:', {
        error: {
          message: axiosError.message,
          stack: axiosError.stack
        },
        response: axios.isAxiosError(error) ? {
          status: error.response?.status,
          data: error.response?.data
        } : undefined
      });
      return false;
    }
  }

  // Send test message
  public async sendTestMessage(phone: string): Promise<void> {
    try {
      // Check API status first
      const isApiAvailable = await this.checkApiStatus();
      if (!isApiAvailable) {
        logger.warn('WhatsApp API is not available, messages will be logged but not sent');
        await this.logMessage({
          instanceId: this.customerInstance,
          to: this.formatPhoneNumber(phone),
          message: `Test message from OnnRides at ${new Date().toLocaleString()}`,
          type: 'test',
          metadata: {
            test: true,
            timestamp: Date.now(),
            notSent: true,
            reason: 'API unavailable'
          }
        });
        return;
      }

      const formattedPhone = this.formatPhoneNumber(phone);
      await this.sendMessage({
        instanceId: this.customerInstance,
        to: formattedPhone,
        message: `Test message from OnnRides at ${new Date().toLocaleString()}`,
        type: 'test',
        metadata: {
          test: true,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      logger.error('Error sending test message via WhatsApp:', error);
      throw error;
    }
  }

  // Log WhatsApp message to database
  private async logMessage(
    messageData: WhatsAppMessage,
    messageId: string | null = null,
    status: string = 'pending',
    error: Error | null = null
  ): Promise<void> {
    // Skip database logging for testing
    logger.info('Skipping database logging for testing:', {
      messageId,
      instanceId: messageData.instanceId,
      to: messageData.to,
      type: messageData.type || 'general',
      status,
      error: error?.message
    });
  }

  // Update message status in logs
  private async updateMessageStatus(messageId: string, status: string, error: Error | null = null): Promise<void> {
    // Skip database update for testing
    logger.info('Skipping database update for testing:', {
      messageId,
      status,
      error: error?.message
    });
  }

  // Generic method to send WhatsApp messages
  private async sendMessage(messageData: WhatsAppMessage): Promise<any> {
    try {
      // Log the outgoing message
      await this.logMessage(messageData);

      // Log the request details
      logger.info('Sending WhatsApp message request:', {
        url: `${WHATSAPP_API_URL}${ENDPOINTS.SEND[0]}`,
        instanceId: messageData.instanceId,
        to: messageData.to,
        type: messageData.type,
        hasApiKey: !!API_KEY
      });

      const response = await axios.post(
        `${WHATSAPP_API_URL}${ENDPOINTS.SEND[0]}`,
        {
          instance_id: messageData.instanceId,
          to: messageData.to,
          message: messageData.message
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
          }
        }
      );

      // Log successful response
      logger.info('WhatsApp message sent successfully:', {
        status: response.status,
        data: response.data
      });

      return response.data;
    } catch (error) {
      const axiosError = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Error sending WhatsApp message:', {
        error: {
          message: axiosError.message,
          stack: axiosError.stack
        },
        response: axios.isAxiosError(error) ? {
          status: error.response?.status,
          data: error.response?.data
        } : undefined
      });
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
        instanceId: this.customerInstance,
        to: booking.customerPhone,
        message: customerMessage,
        type: 'booking_confirmation',
        metadata: {
          bookingId: booking.bookingId,
          customerName: booking.customerName,
          vehicleType: booking.vehicleType
        }
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
        instanceId: this.adminInstance,
        to: this.adminPhone,
        message: adminMessage,
        type: 'booking_confirmation_admin',
        metadata: {
          bookingId: booking.bookingId,
          customerPhone: booking.customerPhone
        }
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
        instanceId: this.customerInstance,
        to: phone,
        message,
        type: 'booking_cancellation',
        metadata: {
          bookingId,
          customerName,
          vehicleName
        }
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
        instanceId: this.customerInstance,
        to: phone,
        message,
        type: 'payment_confirmation',
        metadata: {
          bookingId,
          amount,
          customerName
        }
      });

    } catch (error) {
      logger.error('Error sending payment confirmation via WhatsApp:', error);
      throw error;
    }
  }
} 