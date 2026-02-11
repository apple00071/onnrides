import axios from 'axios';
import logger from '@/lib/logger';
import { query } from '@/lib/db';

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'http://34.45.239.220:3001';
const API_KEY = process.env.WHATSAPP_API_KEY || 'onn7r1d3s_wh4ts4pp_ap1_s3cur3_k3y_9872354176';

const CUSTOMER_INSTANCE = 'instance1';
const ADMIN_INSTANCE = 'instance2';

const ENDPOINTS = {
  SEND: ['/whatsapp/send'],
  STATUS: '/whatsapp/status',
  INSTANCE: (id: string) => `/whatsapp/instance/${id}`,
  CHATS: (id: string) => `/whatsapp/chats/${id}`
};

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
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
  }

  private async checkApiStatus(): Promise<boolean> {
    try {
      const response = await axios.get(`${WHATSAPP_API_URL}${ENDPOINTS.STATUS}`, {
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY }
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  public async sendTestMessage(phone: string): Promise<void> {
    await this.sendMessage(phone, 'This is a test message from OnnRides WhatsApp service.');
  }

  // Overloaded sendMessage for flexibility
  public async sendMessage(messageData: WhatsAppMessage): Promise<any>;
  public async sendMessage(to: string, message: string, instanceId?: string): Promise<any>;
  public async sendMessage(arg1: any, arg2?: any, arg3?: any): Promise<any> {
    let messageData: WhatsAppMessage;

    if (typeof arg1 === 'object' && arg1.to && arg1.message) {
      messageData = arg1;
    } else {
      messageData = {
        to: arg1,
        message: arg2,
        instanceId: arg3 || this.customerInstance
      };
    }

    try {
      const response = await axios.post(
        `${WHATSAPP_API_URL}${ENDPOINTS.SEND[0]}`,
        {
          instanceId: messageData.instanceId,
          number: this.formatPhoneNumber(messageData.to),
          message: messageData.message
        },
        {
          headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY }
        }
      );
      return response.data;
    } catch (error) {
      logger.error('WhatsApp sendMessage failed:', error);
      throw error;
    }
  }

  public async sendBookingConfirmation(booking: BookingDetails): Promise<void> {
    const message = `Hello ${booking.customerName}, your booking ${booking.bookingId} for ${booking.vehicleModel} is confirmed!`;
    await this.sendMessage(booking.customerPhone, message);
    await this.sendMessage(this.adminPhone, `New booking ${booking.bookingId} from ${booking.customerName}`);
  }

  public async sendBookingCancellation(phone: string, customerName: string, vehicleName: string, bookingId: string): Promise<void> {
    const message = `Hello ${customerName}, your booking ${bookingId} for ${vehicleName} has been cancelled.`;
    await this.sendMessage(phone, message);
  }

  public async sendPaymentConfirmation(phone: string, customerName: string, bookingId: string, amount: string): Promise<void> {
    const message = `Hello ${customerName}, your payment of ₹${amount} for booking ${bookingId} has been confirmed.`;
    await this.sendMessage(phone, message);
  }

  public getInitializationStatus(): { isInitialized: boolean; error: Error | null } {
    return { isInitialized: true, error: null };
  }
}