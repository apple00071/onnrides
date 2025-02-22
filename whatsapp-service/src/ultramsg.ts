import logger from './logger';

const INSTANCE_ID = 'instance108219';
const TOKEN = 'kjiva1qf01n0mvkr';
const API_URL = `https://api.ultramsg.com/${INSTANCE_ID}`;

interface UltraMsgResponse {
  status: string;
  message?: string;
  error?: string;
}

export async function sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
  try {
    const phone = formatPhoneNumber(to);
    
    const response = await fetch(`${API_URL}/messages/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        token: TOKEN,
        to: phone,
        body: message,
        priority: '10'
      }).toString()
    });

    if (!response.ok) {
      logger.error('Failed to send WhatsApp message', { 
        to: phone, 
        status: response.status,
        statusText: response.statusText
      });
      return false;
    }

    const result = await response.json() as UltraMsgResponse;

    if (result.status === 'success') {
      logger.info('WhatsApp message sent successfully', { to: phone });
      return true;
    } else {
      logger.error('Failed to send WhatsApp message', { 
        to: phone, 
        error: result.error || result.message 
      });
      return false;
    }
  } catch (error) {
    logger.error('Error sending WhatsApp message:', error);
    return false;
  }
}

// Helper function to format phone numbers
function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Ensure number starts with country code
  return cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
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
📞 +91 83090 31203
📧 contact@onnrides.com`,

  BOOKING_CANCELLATION: (userName: string, vehicleDetails: string, location: string) => `
Hello ${userName}! ⚠️

Your booking for ${vehicleDetails} at ${location} has been cancelled.

We hope to serve you again soon!

Need assistance?
📞 +91 83090 31203
📧 contact@onnrides.com`,

  PAYMENT_CONFIRMATION: (userName: string, amount: string, bookingId: string) => `
Hello ${userName}! 👋

Your payment of ₹${amount} has been received ✅
Booking ID: ${bookingId}

Thank you for choosing OnnRides! 🙏

Need help? Contact us:
📞 +91 83090 31203
📧 contact@onnrides.com`,

  PAYMENT_FAILED: (userName: string, amount: string, bookingId: string, orderId: string) => `
Hello ${userName}! ⚠️

We noticed that your payment was not successful ❌

Amount: ₹${amount}
Booking ID: ${bookingId}
Order ID: ${orderId}

Please try again or contact us:
📞 +91 83090 31203
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
📞 +91 83090 31203
📧 contact@onnrides.com`
}; 