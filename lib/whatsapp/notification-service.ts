import { WaSenderService } from './wasender-service';
import { query } from '../db';
import { formatIST } from '../utils/time-formatter';

// Simple logger for the service
const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${message}`, meta || '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${message}`, meta || '');
  },
  error: (message: string, meta?: any) => {
    console.error(`[ERROR] ${message}`, meta || '');
  }
};

export interface BookingData {
  id: string;
  booking_id: string;
  customer_name?: string;
  phone_number?: string;
  email?: string;
  vehicle_model?: string;
  registration_number?: string;
  start_date: Date;
  end_date: Date;
  total_amount: number;
  pickup_location?: string;
  status: string;
  security_deposit?: number;
}

export interface PaymentData {
  booking_id: string;
  payment_id: string;
  amount: number;
  customer_name?: string;
  phone_number?: string;
}

export interface TripInitiationData {
  booking_id: string;
  customer_name?: string;
  customer_phone?: string;
  vehicle_number?: string;
  emergency_contact?: string;
  emergency_name?: string;
  security_deposit_amount?: number;
}

export interface BookingCancellationData {
  booking_id: string;
  customer_name?: string;
  customer_phone?: string;
  vehicle_model?: string;
  start_date: Date;
  end_date: Date;
  cancellation_reason?: string;
  refund_amount?: number;
  refund_status?: string;
}

export interface BookingExtensionData {
  booking_id: string;
  customer_name?: string;
  customer_phone?: string;
  vehicle_model?: string;
  original_end_date: Date;
  new_end_date: Date;
  additional_hours: number;
  additional_amount: number;
  total_amount: number;
  payment_method?: string;
  payment_reference?: string;
}

export interface BookingCompletionData {
  booking_id: string;
  customer_name?: string;
  customer_phone?: string;
  vehicle_model?: string;
  start_date: Date;
  end_date: Date;
  total_amount: number;
  feedback_link?: string;
}

export interface VehicleReturnData {
  booking_id: string;
  customer_name?: string;
  customer_phone?: string;
  vehicle_model?: string;
  vehicle_number?: string;
  return_date: Date;
  condition_notes?: string;
  additional_charges?: number;
  final_amount?: number;
  security_deposit_refund_amount?: number;
  security_deposit_refund_method?: string;
}

export interface PaymentReminderData {
  booking_id: string;
  customer_name?: string;
  customer_phone?: string;
  vehicle_model?: string;
  amount_due: number;
  due_date?: Date;
  payment_link?: string;
  reminder_type: 'first' | 'second' | 'final';
}

export interface BookingModificationData {
  booking_id: string;
  customer_name?: string;
  customer_phone?: string;
  modification_type: 'dates' | 'vehicle' | 'location' | 'other';
  old_details: string;
  new_details: string;
  modified_by: string;
}

export class WhatsAppNotificationService {
  private static instance: WhatsAppNotificationService;
  private wasenderService: WaSenderService;

  private constructor() {
    this.wasenderService = WaSenderService.getInstance();
  }

  public static getInstance(): WhatsAppNotificationService {
    if (!WhatsAppNotificationService.instance) {
      WhatsAppNotificationService.instance = new WhatsAppNotificationService();
    }
    return WhatsAppNotificationService.instance;
  }

  /**
   * Send booking confirmation message after successful payment
   */
  async sendBookingConfirmation(bookingData: BookingData): Promise<boolean> {
    try {
      if (!bookingData.phone_number) {
        logger.warn('No phone number provided for booking confirmation', { bookingId: bookingData.booking_id });
        return false;
      }

      const message = `🎉 Booking Confirmed!

Dear ${bookingData.customer_name || 'Customer'},

Your booking has been confirmed successfully!

📋 Booking Details:
* Booking ID: ${bookingData.booking_id}
* Vehicle: ${bookingData.vehicle_model}${bookingData.registration_number ? ` (${bookingData.registration_number})` : ''}
* Pickup Date: ${formatIST(bookingData.start_date)}
* Return Date: ${formatIST(bookingData.end_date)}
* Total Amount: ₹${bookingData.total_amount}
${bookingData.security_deposit !== undefined ? `* Security Deposit: ₹${bookingData.security_deposit}` : ''}
${bookingData.pickup_location ? `* Pickup Location: ${bookingData.pickup_location}` : ''}

📋 Documents Required:
* Valid Driving License
* Aadhar Card
* Original documents for verification

📞 Contact Us:
For any queries: +91 8309031203
Email: contact@onnrides.com

Thank you for choosing OnnRides! 🚗`;

      const result = await this.wasenderService.sendTextMessage(bookingData.phone_number, message);

      if (result) {
        await this.logWhatsAppMessage(bookingData.phone_number, message, 'booking_confirmation', 'delivered');
        logger.info('Booking confirmation WhatsApp sent', { bookingId: bookingData.booking_id });
      } else {
        await this.logWhatsAppMessage(bookingData.phone_number, message, 'booking_confirmation', 'failed');
      }

      return result;
    } catch (error) {
      logger.error('Error sending booking confirmation WhatsApp:', error);
      return false;
    }
  }

  /**
   * Send consolidated booking & payment success notification
   */
  async sendBookingSuccessNotification(data: BookingData & PaymentData): Promise<boolean> {
    try {
      if (!data.phone_number) {
        logger.warn('No phone number for booking success notification', { bookingId: data.booking_id });
        return false;
      }

      // Calculate balance to pay
      const balanceAmount = Math.max(0, data.total_amount - data.amount);

      const message = `🎉 Booking Confirmed

Dear ${data.customer_name || 'Customer'},

Your booking has been confirmed!

📋 Booking Details:
* Booking ID: ${data.booking_id}
* Vehicle: ${data.vehicle_model}
* Pickup Date: ${formatIST(data.start_date)}
* Return Date: ${formatIST(data.end_date)}
${data.pickup_location ? `* Location: ${data.pickup_location}` : ''}
* Total Booking Amount: ₹${data.total_amount}
* Advance Paid: ₹${data.amount}
* Balance to Pay at Pickup: ₹${balanceAmount}

📝 Terms & Conditions:
* Original Driving License & Aadhar Card required at pickup.
* Security deposit (if applicable) to be paid at pickup.

You will receive the pickup location and further details shortly.

📞 Contact Us:
For any queries: +91 8309031203
Email: contact@onnrides.com

Thank you for choosing OnnRides! 🏍️ 🚗`;

      const result = await this.wasenderService.sendTextMessage(data.phone_number, message);

      if (result) {
        await this.logWhatsAppMessage(data.phone_number, message, 'booking_success', 'delivered');
        logger.info('Consolidated booking success WhatsApp sent', { bookingId: data.booking_id });
      } else {
        await this.logWhatsAppMessage(data.phone_number, message, 'booking_success', 'failed');
      }

      return result;
    } catch (error) {
      logger.error('Error sending consolidated booking success WhatsApp:', error);
      return false;
    }
  }

  /**
   * Send payment success confirmation (Legacy/Single)
   */
  async sendPaymentConfirmation(paymentData: PaymentData): Promise<boolean> {
    try {
      if (!paymentData.phone_number) {
        logger.warn('No phone number provided for payment confirmation', { bookingId: paymentData.booking_id });
        return false;
      }

      const message = `💳 Payment Successful!

Dear ${paymentData.customer_name || 'Customer'},

Your payment has been processed successfully!

💰 Payment Details:
* Booking ID: ${paymentData.booking_id}
* Amount Paid: ₹${paymentData.amount}
* Payment ID: ${paymentData.payment_id}
* Status: Confirmed ✅

Your booking is now confirmed and active. You will receive pickup details shortly.

📞 Contact Us:
For any queries: +91 8309031203
Email: contact@onnrides.com

Thank you for choosing OnnRides! 🚗`;

      const result = await this.wasenderService.sendTextMessage(paymentData.phone_number, message);

      if (result) {
        await this.logWhatsAppMessage(paymentData.phone_number, message, 'payment_confirmation', 'delivered');
        logger.info('Payment confirmation WhatsApp sent', { bookingId: paymentData.booking_id });
      } else {
        await this.logWhatsAppMessage(paymentData.phone_number, message, 'payment_confirmation', 'failed');
      }

      return result;
    } catch (error) {
      logger.error('Error sending payment confirmation WhatsApp:', error);
      return false;
    }
  }

  /**
   * Send pickup reminder 24 hours before scheduled pickup
   */
  async sendPickupReminder(bookingData: BookingData): Promise<boolean> {
    try {
      if (!bookingData.phone_number) {
        logger.warn('No phone number provided for pickup reminder', { bookingId: bookingData.booking_id });
        return false;
      }

      const message = `⏰ Pickup Reminder

Dear ${bookingData.customer_name || 'Customer'},

This is a reminder for your upcoming vehicle pickup tomorrow!

📋 Booking Details:
* Booking ID: ${bookingData.booking_id}
* Vehicle: ${bookingData.vehicle_model}
* Pickup Date: ${formatIST(bookingData.start_date)}
* Return Date: ${formatIST(bookingData.end_date)}
${bookingData.pickup_location ? `* Pickup Location: ${bookingData.pickup_location}` : ''}

📋 *Please Bring:*
* Valid Driving License (Original)
* Aadhar Card (Original)
* Any additional documents as requested

⚠️ Important:
Please arrive 15 minutes before your scheduled pickup time.

📞 Contact Us:
For any queries: +91 8309031203
Email: contact@onnrides.com

See you tomorrow! 🚗`;

      const result = await this.wasenderService.sendTextMessage(bookingData.phone_number, message);

      if (result) {
        await this.logWhatsAppMessage(bookingData.phone_number, message, 'pickup_reminder', 'delivered');
        logger.info('Pickup reminder WhatsApp sent', { bookingId: bookingData.booking_id });
      } else {
        await this.logWhatsAppMessage(bookingData.phone_number, message, 'pickup_reminder', 'failed');
      }

      return result;
    } catch (error) {
      logger.error('Error sending pickup reminder WhatsApp:', error);
      return false;
    }
  }

  /**
   * Send trip start confirmation when vehicle is handed over
   */
  async sendTripStartConfirmation(tripData: TripInitiationData): Promise<boolean> {
    try {
      if (!tripData.customer_phone) {
        logger.warn('No phone number provided for trip start confirmation', { bookingId: tripData.booking_id });
        return false;
      }

      const message = `🚗 Trip Started!

Dear ${tripData.customer_name || 'Customer'},

Your vehicle has been successfully handed over!

📋 Trip Details:
* Booking ID: ${tripData.booking_id}
${tripData.vehicle_number ? `* Vehicle Number: ${tripData.vehicle_number}` : `* Vehicle Number:`}
* Trip Start Time: ${formatIST(new Date())}
${tripData.security_deposit_amount !== undefined ? `* Security Deposit: ₹${tripData.security_deposit_amount}` : ''}

⚠️ Important Reminders:
* Drive safely and follow traffic rules
* Return the vehicle on time
* Report any issues immediately

📞 24/7 Support:
Emergency: +91 8309031203
Email: contact@onnrides.com

Have a safe journey! 🛣️`;

      const result = await this.wasenderService.sendTextMessage(tripData.customer_phone, message);

      if (result) {
        await this.logWhatsAppMessage(tripData.customer_phone, message, 'trip_start', 'delivered');
        logger.info('Trip start confirmation WhatsApp sent', { bookingId: tripData.booking_id });
      } else {
        await this.logWhatsAppMessage(tripData.customer_phone, message, 'trip_start', 'failed');
      }

      return result;
    } catch (error) {
      logger.error('Error sending trip start confirmation WhatsApp:', error);
      return false;
    }
  }

  /**
   * Send return reminder 24 hours before scheduled return
   */
  async sendReturnReminder(bookingData: BookingData): Promise<boolean> {
    try {
      if (!bookingData.phone_number) {
        logger.warn('No phone number provided for return reminder', { bookingId: bookingData.booking_id });
        return false;
      }

      const message = `Return Reminder

Dear ${bookingData.customer_name || 'Customer'},

This is a reminder that your vehicle return is due tomorrow!

📋 Return Details:
* Booking ID: ${bookingData.booking_id}
* Vehicle: ${bookingData.vehicle_model}
* Return Date: ${formatIST(bookingData.end_date)}
${bookingData.pickup_location ? `* Return Location: ${bookingData.pickup_location}` : ''}

✅ Before Return Checklist:
* Fill fuel tank to the same level as received
* Clean the vehicle (interior & exterior)
* Check for any damages and report immediately

⚠️ Important:
Late returns may incur additional charges.

📞 Contact Us:
For any queries: +91 8309031203
Email: contact@onnrides.com

Thank you for choosing OnnRides! 🚗`;

      const result = await this.wasenderService.sendTextMessage(bookingData.phone_number, message);

      if (result) {
        await this.logWhatsAppMessage(bookingData.phone_number, message, 'return_reminder', 'delivered');
        logger.info('Return reminder WhatsApp sent', { bookingId: bookingData.booking_id });
      } else {
        await this.logWhatsAppMessage(bookingData.phone_number, message, 'return_reminder', 'failed');
      }

      return result;
    } catch (error) {
      logger.error('Error sending return reminder WhatsApp:', error);
      return false;
    }
  }

  /**
   * Send offline booking confirmation
   */
  async sendOfflineBookingConfirmation(bookingData: BookingData): Promise<boolean> {
    try {
      if (!bookingData.phone_number) {
        logger.warn('No phone number provided for offline booking confirmation', { bookingId: bookingData.booking_id });
        return false;
      }

      const message = `📝 Offline Booking Confirmed!

Dear ${bookingData.customer_name || 'Customer'},

Your offline booking has been successfully created!

📋 Booking Details:
* Booking ID: ${bookingData.booking_id}
* Vehicle: ${bookingData.vehicle_model}${bookingData.registration_number ? ` (${bookingData.registration_number})` : ''}
* Start Date: ${formatIST(bookingData.start_date)}
* End Date: ${formatIST(bookingData.end_date)}
* Total Amount: ₹${bookingData.total_amount}
${bookingData.security_deposit !== undefined ? `* Security Deposit: ₹${bookingData.security_deposit}` : ''}
* Status: ${bookingData.status}

✅ *Next Steps:*
* Complete any pending documentation
* Ensure all payments are settled
* Be ready for vehicle handover

📞 Contact Us:
For any queries: +91 8309031203
Email: contact@onnrides.com

Thank you for choosing OnnRides! 🚗`;

      const result = await this.wasenderService.sendTextMessage(bookingData.phone_number, message);

      if (result) {
        await this.logWhatsAppMessage(bookingData.phone_number, message, 'offline_booking', 'delivered');
        logger.info('Offline booking confirmation WhatsApp sent', { bookingId: bookingData.booking_id });
      } else {
        await this.logWhatsAppMessage(bookingData.phone_number, message, 'offline_booking', 'failed');
      }

      return result;
    } catch (error) {
      logger.error('Error sending offline booking confirmation WhatsApp:', error);
      return false;
    }
  }

  /**
   * Send booking cancellation notification
   */
  async sendBookingCancellation(cancellationData: BookingCancellationData): Promise<boolean> {
    try {
      if (!cancellationData.customer_phone) {
        logger.warn('No phone number provided for booking cancellation', { bookingId: cancellationData.booking_id });
        return false;
      }

      const refundInfo = cancellationData.refund_amount
        ? `\n💰 Refund Information:\n* Refund Amount: ₹${cancellationData.refund_amount}\n* Status: ${cancellationData.refund_status || 'Processing'}\n* Refund will be processed within 5-7 business days`
        : '';

      const message = `❌ Booking Cancelled

Dear ${cancellationData.customer_name || 'Customer'},

Your booking has been cancelled successfully.

📋 Cancelled Booking Details:
* Booking ID: ${cancellationData.booking_id}
* Vehicle: ${cancellationData.vehicle_model}
* Original Pickup: ${formatIST(cancellationData.start_date)}
* Original Return: ${formatIST(cancellationData.end_date)}
${cancellationData.cancellation_reason ? `* Reason: ${cancellationData.cancellation_reason}` : ''}${refundInfo}

We're sorry to see you go! If you need to book again in the future, we'll be here to help.

📞 Contact Us:
For any queries: +91 8309031203
Email: contact@onnrides.com

Thank you for considering OnnRides! 🚗`;

      const result = await this.wasenderService.sendTextMessage(cancellationData.customer_phone, message);

      if (result) {
        await this.logWhatsAppMessage(cancellationData.customer_phone, message, 'booking_cancellation', 'delivered');
        logger.info('Booking cancellation WhatsApp sent', { bookingId: cancellationData.booking_id });
      } else {
        await this.logWhatsAppMessage(cancellationData.customer_phone, message, 'booking_cancellation', 'failed');
      }

      return result;
    } catch (error) {
      logger.error('Error sending booking cancellation WhatsApp:', error);
      return false;
    }
  }

  /**
   * Send booking extension notification
   */
  async sendBookingExtension(extensionData: BookingExtensionData): Promise<boolean> {
    try {
      if (!extensionData.customer_phone) {
        logger.warn('No phone number provided for booking extension', { bookingId: extensionData.booking_id });
        return false;
      }

      const message = `⏰ Booking Extended!

Dear ${extensionData.customer_name || 'Customer'},

Your booking has been successfully extended!

📋 Extension Details:
* Booking ID: ${extensionData.booking_id}
* Vehicle: ${extensionData.vehicle_model}
* Original Return: ${formatIST(extensionData.original_end_date)}
* New Return Date: ${formatIST(extensionData.new_end_date)}
* Extension Duration: ${extensionData.additional_hours} Hours

💰 Payment Information:
* Additional Amount: ₹${extensionData.additional_amount}
${extensionData.payment_method ? `* Payment Method: ${extensionData.payment_method.toUpperCase()}` : ''}
${extensionData.payment_reference ? `* Reference: ${extensionData.payment_reference}` : ''}
* New Total Amount: ₹${extensionData.total_amount}

⚠️ Important:
Please ensure you return the vehicle by the new return date to avoid additional charges.

📞 Contact Us:
For any queries: +91 8309031203
Email: contact@onnrides.com

Thank you for choosing OnnRides! 🚗`;

      const result = await this.wasenderService.sendTextMessage(extensionData.customer_phone, message);

      if (result) {
        await this.logWhatsAppMessage(extensionData.customer_phone, message, 'booking_extension', 'delivered');
        logger.info('Booking extension WhatsApp sent', { bookingId: extensionData.booking_id });
      } else {
        await this.logWhatsAppMessage(extensionData.customer_phone, message, 'booking_extension', 'failed');
      }

      return result;
    } catch (error) {
      logger.error('Error sending booking extension WhatsApp:', error);
      return false;
    }
  }

  /**
   * Send booking completion notification
   */
  async sendBookingCompletion(completionData: BookingCompletionData): Promise<boolean> {
    try {
      if (!completionData.customer_phone) {
        logger.warn('No phone number provided for booking completion', { bookingId: completionData.booking_id });
        return false;
      }

      const feedbackSection = completionData.feedback_link
        ? `\n⭐ Share Your Experience:\nWe'd love to hear about your experience! Please share your feedback: ${completionData.feedback_link}`
        : '\n⭐ Share Your Experience:\nWe\'d love to hear about your experience! Please contact us with your feedback.';

      const message = `✅ Booking Completed!

Dear ${completionData.customer_name || 'Customer'},

Thank you for choosing OnnRides! Your trip has been completed successfully.

📋 Completed Trip Details:
* Booking ID: ${completionData.booking_id}
* Vehicle: ${completionData.vehicle_model}
* Trip Duration: ${formatIST(completionData.start_date)} to ${formatIST(completionData.end_date)}
* Total Amount: ₹${completionData.total_amount}

🎉 Thank You!
We hope you had a wonderful experience with our vehicle. Your safety and satisfaction are our top priorities.${feedbackSection}

🚗 *Book Again:*
Need another ride? Visit our website or contact us anytime!

📞 Contact Us:
For any queries: +91 8309031203
Email: contact@onnrides.com

Drive safe and see you again soon! 🛣️`;

      const result = await this.wasenderService.sendTextMessage(completionData.customer_phone, message);

      if (result) {
        await this.logWhatsAppMessage(completionData.customer_phone, message, 'booking_completion', 'delivered');
        logger.info('Booking completion WhatsApp sent', { bookingId: completionData.booking_id });
      } else {
        await this.logWhatsAppMessage(completionData.customer_phone, message, 'booking_completion', 'failed');
      }

      return result;
    } catch (error) {
      logger.error('Error sending booking completion WhatsApp:', error);
      return false;
    }
  }

  /**
   * Send vehicle return confirmation
   */
  async sendVehicleReturnConfirmation(returnData: VehicleReturnData): Promise<boolean> {
    try {
      if (!returnData.customer_phone) {
        logger.warn('No phone number provided for vehicle return confirmation', { bookingId: returnData.booking_id });
        return false;
      }


      const additionalChargesInfo = returnData.additional_charges && returnData.additional_charges > 0
        ? `\n💰 Additional Charges:\n* Amount: ₹${returnData.additional_charges}\n* Final Total: ₹${returnData.final_amount || 'TBD'}`
        : '';

      const conditionInfo = '';

      const securityDepositRefundInfo = returnData.security_deposit_refund_amount && returnData.security_deposit_refund_amount > 0
        ? `\n\n💸 Security Deposit Refund:\n* Refund Amount: ₹${returnData.security_deposit_refund_amount}\n* Status: Processed ✅`
        : '';

      const message = `✅ Trip Completed!

Dear ${returnData.customer_name || 'Customer'},

Your trip has been completed.

📋 Return Details:
* Booking ID: ${returnData.booking_id}
* Vehicle: ${returnData.vehicle_model}${returnData.vehicle_number ? ` (${returnData.vehicle_number})` : ''}
* Return Date: ${formatIST(returnData.return_date)}${additionalChargesInfo}${securityDepositRefundInfo}

🎉 Thank You!
We appreciate your business and hope you had a great experience with OnnRides!

📞 Contact Us:
For any queries: +91 8309031203
Email: contact@onnrides.com

See you again soon! 🚗`;

      const result = await this.wasenderService.sendTextMessage(returnData.customer_phone, message);

      if (result) {
        await this.logWhatsAppMessage(returnData.customer_phone, message, 'vehicle_return', 'delivered');
        logger.info('Vehicle return confirmation WhatsApp sent', { bookingId: returnData.booking_id });
      } else {
        await this.logWhatsAppMessage(returnData.customer_phone, message, 'vehicle_return', 'failed');
      }

      return result;
    } catch (error) {
      logger.error('Error sending vehicle return confirmation WhatsApp:', error);
      return false;
    }
  }

  /**
   * Send payment reminder
   */
  async sendPaymentReminder(reminderData: PaymentReminderData): Promise<boolean> {
    try {
      if (!reminderData.customer_phone) {
        logger.warn('No phone number provided for payment reminder', { bookingId: reminderData.booking_id });
        return false;
      }

      const urgencyLevel = reminderData.reminder_type === 'final' ? '🚨 URGENT' :
        reminderData.reminder_type === 'second' ? '⚠️ REMINDER' : '💳 PAYMENT DUE';

      const dueDateInfo = reminderData.due_date
        ? `\n⏰ Due Date: ${formatIST(reminderData.due_date)}`
        : '';

      const paymentLinkInfo = reminderData.payment_link
        ? `\n💳 Pay Now: ${reminderData.payment_link}`
        : '\n💳 Payment: Please contact us to complete your payment.';

      const message = `${urgencyLevel} Payment Reminder

Dear ${reminderData.customer_name || 'Customer'},

This is a ${reminderData.reminder_type} reminder for your pending payment.

📋 Payment Details:
* Booking ID: ${reminderData.booking_id}
* Vehicle: ${reminderData.vehicle_model}
* Amount Due: ₹${reminderData.amount_due}${dueDateInfo}${paymentLinkInfo}

⚠️ Important:
${reminderData.reminder_type === 'final'
          ? 'This is your final reminder. Please complete payment immediately to avoid booking cancellation.'
          : 'Please complete your payment to confirm your booking and avoid any delays.'}

📞 Contact Us:
For payment assistance: +91 8309031203
Email: contact@onnrides.com

Thank you for choosing OnnRides! 🚗`;

      const result = await this.wasenderService.sendTextMessage(reminderData.customer_phone, message);

      if (result) {
        await this.logWhatsAppMessage(reminderData.customer_phone, message, 'payment_reminder', 'delivered');
        logger.info('Payment reminder WhatsApp sent', { bookingId: reminderData.booking_id });
      } else {
        await this.logWhatsAppMessage(reminderData.customer_phone, message, 'payment_reminder', 'failed');
      }

      return result;
    } catch (error) {
      logger.error('Error sending payment reminder WhatsApp:', error);
      return false;
    }
  }

  /**
   * Send booking modification notification
   */
  async sendBookingModification(modificationData: BookingModificationData): Promise<boolean> {
    try {
      if (!modificationData.customer_phone) {
        logger.warn('No phone number provided for booking modification', { bookingId: modificationData.booking_id });
        return false;
      }

      const modificationIcon = modificationData.modification_type === 'dates' ? '📅' :
        modificationData.modification_type === 'vehicle' ? '🚗' :
          modificationData.modification_type === 'location' ? '📍' : '📝';

      const message = `${modificationIcon} Booking Modified

Dear ${modificationData.customer_name || 'Customer'},

Your booking has been updated by our admin team.

📋 Modification Details:
* Booking ID: ${modificationData.booking_id}
* Modified By: ${modificationData.modified_by}
* Change Type: ${modificationData.modification_type.charAt(0).toUpperCase() + modificationData.modification_type.slice(1)}

🔄 Changes Made:
* Previous: ${modificationData.old_details}
* Updated: ${modificationData.new_details}

✅ Next Steps:
Please review the changes and contact us if you have any questions or concerns.

📞 Contact Us:
For any queries: +91 8309031203
Email: contact@onnrides.com

Thank you for your understanding! 🚗`;

      const result = await this.wasenderService.sendTextMessage(modificationData.customer_phone, message);

      if (result) {
        await this.logWhatsAppMessage(modificationData.customer_phone, message, 'booking_modification', 'delivered');
        logger.info('Booking modification WhatsApp sent', { bookingId: modificationData.booking_id });
      } else {
        await this.logWhatsAppMessage(modificationData.customer_phone, message, 'booking_modification', 'failed');
      }

      return result;
    } catch (error) {
      logger.error('Error sending booking modification WhatsApp:', error);
      return false;
    }
  }

  /**
   * Log WhatsApp message to database
   */
  private async logWhatsAppMessage(
    recipient: string,
    message: string,
    type: string,
    status: 'delivered' | 'failed',
    error?: string
  ): Promise<void> {
    try {
      await query(`
        INSERT INTO whatsapp_logs (
          recipient,
          message,
          status,
          error,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, NOW(), NOW())
      `, [
        recipient,
        `[${type.toUpperCase()}] ${message}`,
        status,
        error || null
      ]);
    } catch (logError) {
      logger.error('Error logging WhatsApp message:', logError);
    }
  }
}
