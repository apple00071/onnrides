import logger from '@/lib/logger';

interface WhatsAppMessageResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

interface WhatsAppErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

const WHATSAPP_API_VERSION = 'v17.0';
const BASE_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

export async function sendWhatsAppMessage(
  to: string,
  templateName: string,
  languageCode: string = 'en',
  components?: any[]
) {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      throw new Error('WhatsApp credentials not configured');
    }

    // Format the phone number (remove any spaces, dashes, etc.)
    const formattedPhone = to.replace(/\D/g, '');

    logger.info('Sending WhatsApp message:', {
      to: formattedPhone,
      template: templateName,
      phoneNumberId
    });

    const response = await fetch(
      `${BASE_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode
            },
            components: components || []
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as WhatsAppErrorResponse;
      logger.error('WhatsApp API Error:', {
        status: response.status,
        error: errorData.error
      });
      throw new Error(`WhatsApp API Error: ${errorData.error.message}`);
    }

    const successData = data as WhatsAppMessageResponse;
    logger.info('WhatsApp message sent successfully:', {
      messageId: successData.messages?.[0]?.id,
      recipient: successData.contacts?.[0]?.wa_id
    });

    return successData;
  } catch (error) {
    logger.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

// Helper function to send a booking confirmation message
export async function sendBookingConfirmation(
  phoneNumber: string,
  bookingId: string,
  vehicleName: string,
  startDate: string,
  endDate: string,
  totalAmount: string
) {
  return sendWhatsAppMessage(
    phoneNumber,
    'booking_confirmation',
    'en',
    [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: bookingId },
          { type: 'text', text: vehicleName },
          { type: 'text', text: startDate },
          { type: 'text', text: endDate },
          { type: 'text', text: totalAmount }
        ]
      }
    ]
  );
}

// Helper function to send a payment confirmation message
export async function sendPaymentConfirmation(
  phoneNumber: string,
  bookingId: string,
  amount: string,
  paymentId: string
) {
  return sendWhatsAppMessage(
    phoneNumber,
    'payment_confirmation',
    'en',
    [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: bookingId },
          { type: 'text', text: amount },
          { type: 'text', text: paymentId }
        ]
      }
    ]
  );
} 