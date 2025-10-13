import { WhatsAppNotificationService } from '../lib/whatsapp/notification-service';

async function testWhatsAppNotifications() {
  console.log('🧪 Testing WhatsApp Notification Service...\n');
  
  const whatsappService = WhatsAppNotificationService.getInstance();
  const testPhone = process.env.TEST_PHONE_NUMBER || '919182495481';
  const testBookingId = 'TEST-' + Date.now();
  
  console.log(`📱 Test phone number: ${testPhone}`);
  console.log(`🆔 Test booking ID: ${testBookingId}\n`);

  // Test data
  const testCustomer = {
    name: 'John Doe',
    phone: testPhone
  };

  const testVehicle = {
    name: 'Honda Activa 6G',
    number: 'TS09EA1234'
  };

  const testDates = {
    start: new Date(),
    end: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours later
  };

  try {
    // Test 1: Booking Cancellation
    console.log('1️⃣ Testing Booking Cancellation Notification...');
    const cancellationResult = await whatsappService.sendBookingCancellation({
      booking_id: testBookingId,
      customer_name: testCustomer.name,
      customer_phone: testCustomer.phone,
      vehicle_model: testVehicle.name,
      start_date: testDates.start,
      end_date: testDates.end,
      cancellation_reason: 'Test cancellation',
      refund_amount: 1500,
      refund_status: 'Processing'
    });
    console.log(`   Result: ${cancellationResult ? '✅ Success' : '❌ Failed'}\n`);

    // Test 2: Booking Extension
    console.log('2️⃣ Testing Booking Extension Notification...');
    const extensionResult = await whatsappService.sendBookingExtension({
      booking_id: testBookingId,
      customer_name: testCustomer.name,
      customer_phone: testCustomer.phone,
      vehicle_model: testVehicle.name,
      original_end_date: testDates.end,
      new_end_date: new Date(testDates.end.getTime() + 6 * 60 * 60 * 1000), // 6 hours later
      additional_hours: 6,
      additional_amount: 300,
      total_amount: 1800
    });
    console.log(`   Result: ${extensionResult ? '✅ Success' : '❌ Failed'}\n`);

    // Test 3: Booking Completion
    console.log('3️⃣ Testing Booking Completion Notification...');
    const completionResult = await whatsappService.sendBookingCompletion({
      booking_id: testBookingId,
      customer_name: testCustomer.name,
      customer_phone: testCustomer.phone,
      vehicle_model: testVehicle.name,
      start_date: testDates.start,
      end_date: testDates.end,
      total_amount: 1500,
      feedback_link: 'https://onnrides.com/feedback'
    });
    console.log(`   Result: ${completionResult ? '✅ Success' : '❌ Failed'}\n`);

    // Test 4: Vehicle Return
    console.log('4️⃣ Testing Vehicle Return Notification...');
    const returnResult = await whatsappService.sendVehicleReturnConfirmation({
      booking_id: testBookingId,
      customer_name: testCustomer.name,
      customer_phone: testCustomer.phone,
      vehicle_model: testVehicle.name,
      vehicle_number: testVehicle.number,
      return_date: new Date(),
      condition_notes: 'Vehicle returned in good condition',
      additional_charges: 0,
      final_amount: 1500
    });
    console.log(`   Result: ${returnResult ? '✅ Success' : '❌ Failed'}\n`);

    // Test 5: Payment Reminder
    console.log('5️⃣ Testing Payment Reminder Notification...');
    const reminderResult = await whatsappService.sendPaymentReminder({
      booking_id: testBookingId,
      customer_name: testCustomer.name,
      customer_phone: testCustomer.phone,
      vehicle_model: testVehicle.name,
      amount_due: 1500,
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
      payment_link: 'https://onnrides.com/payment/' + testBookingId,
      reminder_type: 'first'
    });
    console.log(`   Result: ${reminderResult ? '✅ Success' : '❌ Failed'}\n`);

    // Test 6: Booking Modification
    console.log('6️⃣ Testing Booking Modification Notification...');
    const modificationResult = await whatsappService.sendBookingModification({
      booking_id: testBookingId,
      customer_name: testCustomer.name,
      customer_phone: testCustomer.phone,
      modification_type: 'dates',
      old_details: 'Dec 12, 2024 - Dec 13, 2024',
      new_details: 'Dec 13, 2024 - Dec 14, 2024',
      modified_by: 'Admin Test'
    });
    console.log(`   Result: ${modificationResult ? '✅ Success' : '❌ Failed'}\n`);

    console.log('🎉 WhatsApp Notification Testing Complete!');
    console.log('📋 Summary:');
    console.log(`   • Cancellation: ${cancellationResult ? '✅' : '❌'}`);
    console.log(`   • Extension: ${extensionResult ? '✅' : '❌'}`);
    console.log(`   • Completion: ${completionResult ? '✅' : '❌'}`);
    console.log(`   • Return: ${returnResult ? '✅' : '❌'}`);
    console.log(`   • Payment Reminder: ${reminderResult ? '✅' : '❌'}`);
    console.log(`   • Modification: ${modificationResult ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testWhatsAppNotifications()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { testWhatsAppNotifications };
