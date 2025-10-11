import { WaSenderService } from '../lib/whatsapp/wasender-service';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testWaSenderService() {
  console.log('🚀 Testing WaSender Service...\n');

  const wasenderService = WaSenderService.getInstance();

  // Test 1: Check session status
  console.log('📊 Checking session status...');
  try {
    const sessionStatus = await wasenderService.getSessionStatus();
    if (sessionStatus) {
      console.log('✅ Session status retrieved successfully');
      console.log('Sessions:', sessionStatus.response?.data?.length || 0);
    } else {
      console.log('❌ Failed to retrieve session status');
    }
  } catch (error) {
    console.log('❌ Error checking session status:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Send a simple text message
  console.log('📱 Testing simple text message...');
  const testPhone = process.env.TEST_PHONE_NUMBER || '919182495481'; // Default to admin phone
  const testMessage = `🧪 Test message from OnnRides WaSender integration\n\nTimestamp: ${new Date().toISOString()}\n\nThis is a test to verify WhatsApp integration is working correctly.`;

  try {
    const result = await wasenderService.sendTextMessage(testPhone, testMessage);
    if (result) {
      console.log('✅ Text message sent successfully');
    } else {
      console.log('❌ Failed to send text message');
    }
  } catch (error) {
    console.log('❌ Error sending text message:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Send booking confirmation
  console.log('📋 Testing booking confirmation message...');
  const bookingData = {
    customerName: 'John Doe',
    customerPhone: testPhone,
    vehicleType: 'Bike',
    vehicleModel: 'Honda Activa 6G',
    startDate: new Date().toLocaleDateString('en-IN'),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'),
    bookingId: 'TEST-' + Date.now(),
    totalAmount: '500'
  };

  try {
    const result = await wasenderService.sendBookingConfirmation(bookingData);
    if (result) {
      console.log('✅ Booking confirmation sent successfully');
    } else {
      console.log('❌ Failed to send booking confirmation');
    }
  } catch (error) {
    console.log('❌ Error sending booking confirmation:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Send payment confirmation
  console.log('💳 Testing payment confirmation message...');
  const paymentData = {
    customerName: 'John Doe',
    customerPhone: testPhone,
    bookingId: bookingData.bookingId,
    amount: '500',
    paymentId: 'PAY-' + Date.now()
  };

  try {
    const result = await wasenderService.sendPaymentConfirmation(paymentData);
    if (result) {
      console.log('✅ Payment confirmation sent successfully');
    } else {
      console.log('❌ Failed to send payment confirmation');
    }
  } catch (error) {
    console.log('❌ Error sending payment confirmation:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');
  console.log('🏁 WaSender service testing completed!');
  console.log('\nNote: Check your WhatsApp to verify messages were received.');
  console.log('If messages are not received, verify your WaSender API credentials and session status.');
}

// Run the test
if (require.main === module) {
  testWaSenderService().catch(console.error);
}

export { testWaSenderService };
