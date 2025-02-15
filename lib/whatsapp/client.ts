import logger from '@/lib/logger';

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL;
const WHATSAPP_SERVICE_KEY = process.env.WHATSAPP_SERVICE_KEY;

interface SendMessageParams {
  to: string;
  message: string;
  bookingId?: string;
}

interface BookingConfirmationParams {
  phone: string;
  userName: string;
  vehicleDetails: string;
  bookingDate: string;
  bookingId?: string;
}

interface BookingCancellationParams {
  phone: string;
  userName: string;
  vehicleDetails: string;
  bookingId?: string;
}

interface PaymentConfirmationParams {
  phone: string;
  userName: string;
  amount: string;
  bookingId: string;
}

class WhatsAppClient {
  private static instance: WhatsAppClient;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  private constructor() {
    if (!WHATSAPP_SERVICE_URL || !WHATSAPP_SERVICE_KEY) {
      throw new Error('WhatsApp service configuration missing');
    }
    this.baseUrl = WHATSAPP_SERVICE_URL;
    this.apiKey = WHATSAPP_SERVICE_KEY;
  }

  public static getInstance(): WhatsAppClient {
    if (!WhatsAppClient.instance) {
      WhatsAppClient.instance = new WhatsAppClient();
    }
    return WhatsAppClient.instance;
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' = 'POST', body?: any) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'WhatsApp service request failed');
      }

      return response.json();
    } catch (error) {
      logger.error('WhatsApp service error:', error);
      throw error;
    }
  }

  public async sendMessage({ to, message, bookingId }: SendMessageParams) {
    return this.makeRequest('/send', 'POST', { to, message, bookingId });
  }

  public async sendBookingConfirmation(params: BookingConfirmationParams) {
    return this.makeRequest('/send/booking-confirmation', 'POST', params);
  }

  public async sendBookingCancellation(params: BookingCancellationParams) {
    return this.makeRequest('/send/booking-cancellation', 'POST', params);
  }

  public async sendPaymentConfirmation(params: PaymentConfirmationParams) {
    return this.makeRequest('/send/payment-confirmation', 'POST', params);
  }

  public async getStatus() {
    return this.makeRequest('/status', 'GET');
  }

  public async initialize() {
    return this.makeRequest('/init', 'POST');
  }
}

export const whatsappClient = WhatsAppClient.getInstance(); 