/**
 * Integration Example: How to use WaSender service in your existing code
 * 
 * This file shows examples of how to integrate the WaSender WhatsApp service
 * into your existing booking and payment flows.
 */

import { WaSenderService } from './wasender-service';

// Example 1: Integration in booking confirmation flow
export async function handleBookingConfirmation(bookingData: any) {
  try {
    // Your existing booking logic here...
    console.log('Processing booking confirmation...');

    // Send WhatsApp notification using WaSender
    const wasenderService = WaSenderService.getInstance();
    
    const whatsappData = {
      customerName: bookingData.customer_name || bookingData.customerName,
      customerPhone: bookingData.phone_number || bookingData.customerPhone,
      vehicleType: bookingData.vehicle?.type || 'Vehicle',
      vehicleModel: bookingData.vehicle?.model || 'Unknown Model',
      startDate: new Date(bookingData.start_date || bookingData.startDate).toLocaleDateString('en-IN'),
      endDate: new Date(bookingData.end_date || bookingData.endDate).toLocaleDateString('en-IN'),
      bookingId: bookingData.id || bookingData.bookingId,
      totalAmount: (bookingData.total_amount || bookingData.totalAmount).toString()
    };

    const success = await wasenderService.sendBookingConfirmation(whatsappData);
    
    if (success) {
      console.log('WhatsApp booking confirmation sent successfully');
    } else {
      console.log('Failed to send WhatsApp booking confirmation');
    }

    return { success, bookingData };
  } catch (error) {
    console.error('Error in booking confirmation flow:', error);
    throw error;
  }
}

// Example 2: Integration in payment confirmation flow
export async function handlePaymentConfirmation(paymentData: any) {
  try {
    // Your existing payment logic here...
    console.log('Processing payment confirmation...');

    // Send WhatsApp notification using WaSender
    const wasenderService = WaSenderService.getInstance();
    
    const whatsappData = {
      customerName: paymentData.customer_name || paymentData.customerName,
      customerPhone: paymentData.phone_number || paymentData.customerPhone,
      bookingId: paymentData.booking_id || paymentData.bookingId,
      amount: (paymentData.amount || paymentData.totalAmount).toString(),
      paymentId: paymentData.payment_id || paymentData.paymentId || paymentData.id
    };

    const success = await wasenderService.sendPaymentConfirmation(whatsappData);
    
    if (success) {
      console.log('WhatsApp payment confirmation sent successfully');
    } else {
      console.log('Failed to send WhatsApp payment confirmation');
    }

    return { success, paymentData };
  } catch (error) {
    console.error('Error in payment confirmation flow:', error);
    throw error;
  }
}

// Example 3: Custom message for specific scenarios
export async function sendCustomWhatsAppMessage(
  phoneNumber: string, 
  messageType: 'reminder' | 'cancellation' | 'update' | 'custom',
  data: any
) {
  const wasenderService = WaSenderService.getInstance();
  
  let message = '';
  
  switch (messageType) {
    case 'reminder':
      message = `🔔 *Booking Reminder*

Dear ${data.customerName},

This is a reminder for your upcoming booking:
• Booking ID: ${data.bookingId}
• Vehicle: ${data.vehicleModel}
• Date: ${data.date}
• Time: ${data.time}

Please be ready for pickup/delivery.

Contact us: +91 9182495481`;
      break;
      
    case 'cancellation':
      message = `❌ *Booking Cancelled*

Dear ${data.customerName},

Your booking has been cancelled:
• Booking ID: ${data.bookingId}
• Reason: ${data.reason || 'As requested'}

${data.refundInfo ? `Refund will be processed within 3-5 business days.` : ''}

Contact us: +91 9182495481`;
      break;
      
    case 'update':
      message = `📝 *Booking Updated*

Dear ${data.customerName},

Your booking has been updated:
• Booking ID: ${data.bookingId}
• Changes: ${data.changes}

Contact us: +91 9182495481`;
      break;
      
    case 'custom':
      message = data.message;
      break;
  }
  
  return await wasenderService.sendTextMessage(phoneNumber, message);
}

// Example 4: Bulk messaging (with rate limiting consideration)
export async function sendBulkWhatsAppMessages(recipients: Array<{phone: string, message: string}>) {
  const wasenderService = WaSenderService.getInstance();
  const results = [];
  
  for (const recipient of recipients) {
    try {
      const success = await wasenderService.sendTextMessage(recipient.phone, recipient.message);
      results.push({ phone: recipient.phone, success });
      
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    } catch (error) {
      console.error(`Failed to send message to ${recipient.phone}:`, error);
      results.push({ phone: recipient.phone, success: false, error });
    }
  }
  
  return results;
}

// Example 5: Integration with existing notification system
export class NotificationService {
  private wasenderService: WaSenderService;
  
  constructor() {
    this.wasenderService = WaSenderService.getInstance();
  }
  
  async sendNotification(
    type: 'booking' | 'payment' | 'reminder' | 'custom',
    recipient: string,
    data: any
  ) {
    try {
      switch (type) {
        case 'booking':
          return await this.wasenderService.sendBookingConfirmation(data);
          
        case 'payment':
          return await this.wasenderService.sendPaymentConfirmation(data);
          
        case 'reminder':
        case 'custom':
          return await this.wasenderService.sendTextMessage(recipient, data.message);
          
        default:
          throw new Error(`Unsupported notification type: ${type}`);
      }
    } catch (error) {
      console.error('Notification service error:', error);
      return false;
    }
  }
  
  async getServiceStatus() {
    return await this.wasenderService.getSessionStatus();
  }
}

// Example 6: API route integration (for Next.js API routes)
export async function handleWhatsAppAPI(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { type, phone, data } = req.body;
  
  if (!type || !phone) {
    return res.status(400).json({ error: 'Type and phone are required' });
  }
  
  const wasenderService = WaSenderService.getInstance();
  
  try {
    let result = false;
    
    switch (type) {
      case 'text':
        result = await wasenderService.sendTextMessage(phone, data.message);
        break;
        
      case 'booking':
        result = await wasenderService.sendBookingConfirmation(data);
        break;
        
      case 'payment':
        result = await wasenderService.sendPaymentConfirmation(data);
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid message type' });
    }
    
    return res.status(200).json({ success: result });
  } catch (error) {
    console.error('WhatsApp API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export the notification service for easy use
export const notificationService = new NotificationService();
