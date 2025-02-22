import logger from '../logger';

// Debug logging for environment variables and configuration
logger.info('UltraMsg Configuration:', {
  env: process.env.NODE_ENV,
  config: {
    instance_id: process.env.ULTRAMSG_INSTANCE_ID || 'instance108219',
    has_token: !!process.env.ULTRAMSG_TOKEN,
    api_url: `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE_ID || 'instance108219'}`
  }
});

const INSTANCE_ID = process.env.ULTRAMSG_INSTANCE_ID || 'instance108219';
const TOKEN = process.env.ULTRAMSG_TOKEN || 'kjiva1qf01n0mvkr';
const API_URL = `https://api.ultramsg.com/${INSTANCE_ID}`;

interface UltraMsgResponse {
  sent: string;
  message: string;
  id?: string;
}

// Helper function to format phone numbers
function formatPhoneNumber(phone: string): string {
  if (!phone) {
    throw new Error('Phone number is required');
  }

  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Validate phone number length (assuming Indian numbers)
  if (cleaned.length < 10 || cleaned.length > 12) {
    throw new Error('Invalid phone number length');
  }

  // If it's a 10-digit number, add 91 prefix
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }

  // If it already has country code (91), use as is
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned;
  }

  throw new Error('Invalid phone number format');
}

export async function sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
  try {
    if (!INSTANCE_ID || !TOKEN) {
      logger.error('Missing UltraMsg configuration');
      throw new Error('UltraMsg configuration is incomplete');
    }

    const phone = formatPhoneNumber(to);
    
    logger.info('Sending WhatsApp message:', {
      environment: process.env.NODE_ENV,
      url: `${API_URL}/messages/chat`,
      phone,
      message_length: message.length,
      instance_id: INSTANCE_ID
    });

    const body = new URLSearchParams({
      token: TOKEN,
      to: phone,
      body: message,
      priority: '10'
    }).toString();

    const response = await fetch(`${API_URL}/messages/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });

    const responseText = await response.text();
    logger.info('WhatsApp API Response:', {
      status: response.status,
      ok: response.ok,
      response_text: responseText
    });

    if (!response.ok) {
      logger.error('WhatsApp API Error:', {
        status: response.status,
        statusText: response.statusText,
        response: responseText,
        url: response.url
      });
      return false;
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('Failed to parse WhatsApp API response:', {
        error: parseError,
        response_text: responseText
      });
      return false;
    }

    if (result.sent === 'true') {
      logger.info('WhatsApp message sent successfully:', {
        message_id: result.id,
        recipient: phone
      });
      return true;
    } else {
      logger.error('WhatsApp message failed:', {
        error: result.message,
        recipient: phone
      });
      return false;
    }
  } catch (error) {
    logger.error('WhatsApp message error:', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      recipient: to
    });
    return false;
  }
}

export const WHATSAPP_MESSAGE_TEMPLATES = {
  BOOKING_CONFIRMATION: (userName: string, vehicleDetails: string, location: string, pickupDateTime: string, dropoffDateTime: string) => `
Hello ${userName}! 👋

Your booking has been confirmed ✅

Vehicle: ${vehicleDetails}
📍 Location: ${location}

📅 Pickup: ${pickupDateTime}
📅 Drop-off: ${dropoffDateTime}

Thank you for choosing OnnRides! 🙏

Need help? Contact us:
📞 +91 8247494622
📧 contact@onnrides.com`,

  BOOKING_CANCELLATION: (userName: string, vehicleDetails: string, location: string) => `
Hello ${userName}! ⚠️

Your booking for ${vehicleDetails} at ${location} has been cancelled.

We hope to serve you again soon!

Need assistance?
📞 +91 8247494622
📧 contact@onnrides.com`,

  PAYMENT_CONFIRMATION: (userName: string, amount: string, bookingId: string) => `
Hello ${userName}! 👋

Your payment of ₹${amount} has been received ✅
Booking ID: ${bookingId}

Thank you for choosing OnnRides! 🙏

Need help? Contact us:
📞 +91 8247494622
📧 contact@onnrides.com`,

  PAYMENT_FAILED: (userName: string, amount: string, bookingId: string, orderId: string) => `
Hello ${userName}! ⚠️

We noticed that your payment was not successful ❌

Amount: ₹${amount}
Booking ID: ${bookingId}
Order ID: ${orderId}

Please try again or contact us:
📞 +91 8247494622
📧 contact@onnrides.com`,

  BOOKING_REMINDER: (userName: string, vehicleDetails: string, location: string, pickupDateTime: string, dropoffDateTime: string) => `
Hello ${userName}! 👋

Reminder: Your upcoming booking 🔔

Vehicle: ${vehicleDetails}
📍 Location: ${location}

📅 Pickup: ${pickupDateTime}
📅 Drop-off: ${dropoffDateTime}

We're looking forward to serving you!

Need assistance?
📞 +91 8247494622
📧 contact@onnrides.com`
}; 