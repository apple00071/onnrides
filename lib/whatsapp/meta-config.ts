import logger from '@/lib/logger';

// Meta WhatsApp API Configuration
const WHATSAPP_API_VERSION = 'v17.0';
const BASE_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;
const WEBHOOK_URL = 'https://onnrides.in/api/webhook/whatsapp';

interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId: string;
}

interface MessageResponse {
  messaging_product: string;
  contacts: Array<{ wa_id: string }>;
  messages: Array<{ id: string }>;
}

// Message Templates
export const MESSAGE_TEMPLATES = {
  BOOKING_CONFIRMATION: {
    name: 'booking_confirmation',
    language: 'en',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: '{{1}}' }, // Customer Name
          { type: 'text', text: '{{2}}' }, // Vehicle Details
          { type: 'text', text: '{{3}}' }, // Pickup Date/Time
          { type: 'text', text: '{{4}}' }, // Drop-off Date/Time
          { type: 'text', text: '{{5}}' }  // Booking ID
        ]
      }
    ]
  },
  PAYMENT_CONFIRMATION: {
    name: 'payment_confirmation',
    language: 'en',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: '{{1}}' }, // Customer Name
          { type: 'text', text: '{{2}}' }, // Amount
          { type: 'text', text: '{{3}}' }  // Booking ID
        ]
      }
    ]
  }
};

export class WhatsAppService {
  private static instance: WhatsAppService;
  private config: WhatsAppConfig;

  private constructor() {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

    if (!phoneNumberId || !accessToken || !businessAccountId) {
      throw new Error('Missing WhatsApp configuration');
    }

    this.config = {
      phoneNumberId,
      accessToken,
      businessAccountId
    };
  }

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  private async sendRequest(endpoint: string, data: any) {
    try {
      const response = await fetch(`${BASE_URL}/${this.config.phoneNumberId}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to send WhatsApp message');
      }

      return await response.json();
    } catch (error) {
      logger.error('WhatsApp API Error:', error);
      throw error;
    }
  }

  public async sendTemplate(
    to: string,
    template: keyof typeof MESSAGE_TEMPLATES,
    parameters: string[]
  ) {
    const templateConfig = MESSAGE_TEMPLATES[template];
    
    const messageData = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateConfig.name,
        language: {
          code: templateConfig.language
        },
        components: templateConfig.components.map(component => ({
          ...component,
          parameters: component.parameters.map((param, index) => ({
            ...param,
            text: parameters[index]
          }))
        }))
      }
    };

    return this.sendRequest('/messages', messageData);
  }

  public async sendTextMessage(to: string, message: string) {
    const messageData = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: message
      }
    };

    return this.sendRequest('/messages', messageData);
  }
} 