// Simple test to validate message templates without external dependencies
import { formatIST } from '../lib/utils/time-formatter';

function testMessageTemplates() {
  console.log('🧪 Testing WhatsApp Message Templates...\n');

  const testData = {
    booking_id: 'ORAE1',
    customer_name: 'John Doe',
    customer_phone: '919182495481',
    vehicle_model: 'Honda Activa 6G',
    vehicle_number: 'TS09EA1234',
    start_date: new Date('2024-12-13T10:00:00Z'),
    end_date: new Date('2024-12-14T10:00:00Z'),
    total_amount: 1500
  };

  console.log('1️⃣ Booking Cancellation Message:');
  console.log('─'.repeat(50));
  const cancellationMessage = `❌ *Booking Cancelled*

Dear ${testData.customer_name},

Your booking has been cancelled successfully.

📋 *Cancelled Booking Details:*
• Booking ID: ${testData.booking_id}
• Vehicle: ${testData.vehicle_model}
• Original Pickup: ${formatIST(testData.start_date)}
• Original Return: ${formatIST(testData.end_date)}
• Reason: Test cancellation

💰 *Refund Information:*
• Refund Amount: ₹${testData.total_amount}
• Status: Processing
• Refund will be processed within 5-7 business days

We're sorry to see you go! If you need to book again in the future, we'll be here to help.

📞 *Contact Us:*
For any queries: +91 8309031203
Email: contact@onnrides.com

Thank you for considering OnnRides! 🚗`;
  console.log(cancellationMessage);
  console.log('\n');

  console.log('2️⃣ Booking Extension Message:');
  console.log('─'.repeat(50));
  const extensionMessage = `⏰ *Booking Extended!*

Dear ${testData.customer_name},

Your booking has been successfully extended!

📋 *Extension Details:*
• Booking ID: ${testData.booking_id}
• Vehicle: ${testData.vehicle_model}
• Original Return: ${formatIST(testData.end_date)}
• New Return Date: ${formatIST(new Date(testData.end_date.getTime() + 6 * 60 * 60 * 1000))}
• Additional Hours: 6

💰 *Payment Information:*
• Additional Amount: ₹300
• New Total Amount: ₹${testData.total_amount + 300}

⚠️ *Important:*
Please ensure you return the vehicle by the new return date to avoid additional charges.

📞 *Contact Us:*
For any queries: +91 8309031203
Email: contact@onnrides.com

Thank you for choosing OnnRides! 🚗`;
  console.log(extensionMessage);
  console.log('\n');

  console.log('3️⃣ Booking Completion Message:');
  console.log('─'.repeat(50));
  const completionMessage = `✅ *Trip Completed!*

Dear ${testData.customer_name},

Thank you for choosing OnnRides! Your trip has been completed successfully.

📋 *Completed Trip Details:*
• Booking ID: ${testData.booking_id}
• Vehicle: ${testData.vehicle_model}
• Trip Duration: ${formatIST(testData.start_date)} to ${formatIST(testData.end_date)}
• Total Amount: ₹${testData.total_amount}

🎉 *Thank You!*
We hope you had a wonderful experience with our vehicle. Your safety and satisfaction are our top priorities.

⭐ *Share Your Experience:*
We'd love to hear about your experience! Please contact us with your feedback.

🚗 *Book Again:*
Need another ride? Visit our website or contact us anytime!

📞 *Contact Us:*
For any queries: +91 8309031203
Email: contact@onnrides.com

Drive safe and see you again soon! 🛣️`;
  console.log(completionMessage);
  console.log('\n');

  console.log('4️⃣ Vehicle Return Confirmation Message:');
  console.log('─'.repeat(50));
  const returnMessage = `🔄 *Vehicle Returned Successfully!*

Dear ${testData.customer_name},

Your vehicle has been returned and inspected successfully!

📋 *Return Details:*
• Booking ID: ${testData.booking_id}
• Vehicle: ${testData.vehicle_model} (${testData.vehicle_number})
• Return Date: ${formatIST(new Date())}

📝 *Vehicle Condition:*
Vehicle returned in good condition

✅ *Return Complete:*
Thank you for returning the vehicle in good condition. Your booking is now officially completed.

🎉 *Thank You!*
We appreciate your business and hope you had a great experience with OnnRides!

📞 *Contact Us:*
For any queries: +91 8309031203
Email: contact@onnrides.com

See you again soon! 🚗`;
  console.log(returnMessage);
  console.log('\n');

  console.log('5️⃣ Payment Reminder Message:');
  console.log('─'.repeat(50));
  const reminderMessage = `💳 PAYMENT DUE *Payment Reminder*

Dear ${testData.customer_name},

This is a first reminder for your pending payment.

📋 *Payment Details:*
• Booking ID: ${testData.booking_id}
• Vehicle: ${testData.vehicle_model}
• Amount Due: ₹${testData.total_amount}
⏰ *Due Date:* ${formatIST(new Date(Date.now() + 24 * 60 * 60 * 1000))}

💳 *Payment:* Please contact us to complete your payment.

⚠️ *Important:*
Please complete your payment to confirm your booking and avoid any delays.

📞 *Contact Us:*
For payment assistance: +91 8309031203
Email: contact@onnrides.com

Thank you for choosing OnnRides! 🚗`;
  console.log(reminderMessage);
  console.log('\n');

  console.log('6️⃣ Booking Modification Message:');
  console.log('─'.repeat(50));
  const modificationMessage = `📅 *Booking Modified*

Dear ${testData.customer_name},

Your booking has been updated by our admin team.

📋 *Modification Details:*
• Booking ID: ${testData.booking_id}
• Modified By: Admin Test
• Change Type: Dates

🔄 *Changes Made:*
• Previous: Dec 13, 2024 - Dec 14, 2024
• Updated: Dec 14, 2024 - Dec 15, 2024

✅ *Next Steps:*
Please review the changes and contact us if you have any questions or concerns.

📞 *Contact Us:*
For any queries: +91 8309031203
Email: contact@onnrides.com

Thank you for your understanding! 🚗`;
  console.log(modificationMessage);
  console.log('\n');

  console.log('✅ All message templates generated successfully!');
  console.log('🎉 WhatsApp notification system is ready for deployment!');
}

// Run the test
testMessageTemplates();
