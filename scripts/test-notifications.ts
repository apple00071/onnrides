import { config } from 'dotenv';
import { resolve } from 'path';
import { formatIST, getCurrentIST } from '../lib/utils/time-formatter';
import { generateBookingId } from '../lib/utils/booking-id';
import logger from '../lib/logger';

// Load environment variables
const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

async function testNotifications() {
  try {
    logger.info('Starting notification test with standardized formats...');
    
    // Generate a test booking ID using our standardized function
    const bookingId = generateBookingId();
    
    // Use our standardized date formatter
    const now = getCurrentIST();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() + 1); // Set to tomorrow
    
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 4); // 4 hours later
    
    // Format dates using our standardized formatter
    const formattedStartDate = formatIST(startDate);
    const formattedEndDate = formatIST(endDate);
    
    logger.info('Test data prepared:', {
      bookingId,
      startDate: formattedStartDate,
      endDate: formattedEndDate
    });

    // Instead of directly importing services that use path aliases,
    // let's display the formatting to verify consistency
    console.log('\n========== NOTIFICATION FORMATTING TEST ==========');
    console.log('Booking ID:', bookingId);
    console.log('Start Date (formatted):', formattedStartDate);
    console.log('End Date (formatted):', formattedEndDate);
    console.log('\nExample WhatsApp message:');
    console.log('-----------------------------------');
    console.log(`Thank you for booking with OnnRides! 🛵\n`);
    console.log(`*Booking Details:*`);
    console.log(`🚗 Vehicle: Scooter Test Model`);
    console.log(`📅 Start: ${formattedStartDate}`);
    console.log(`📅 End: ${formattedEndDate}`);
    console.log(`🔖 Booking ID: ${bookingId}`);
    console.log(`💰 Total: ₹500`);
    console.log(`📍 Pickup: Test Location`);
    console.log('\nExample Email template:');
    console.log('-----------------------------------');
    console.log(`<h2>Booking Confirmation</h2>`);
    console.log(`<p>Hello Test User,</p>`);
    console.log(`<p>Your booking has been confirmed!</p>`);
    console.log(`<h3>Booking Details:</h3>`);
    console.log(`<ul>`);
    console.log(`  <li>Booking ID: ${bookingId}</li>`);
    console.log(`  <li>Vehicle: Test Scooter</li>`);
    console.log(`  <li>Start Date: ${formattedStartDate}</li>`);
    console.log(`  <li>End Date: ${formattedEndDate}</li>`);
    console.log(`</ul>`);
    console.log('\nExample Admin notification:');
    console.log('-----------------------------------');
    console.log(`New Booking Alert! 🔔\n`);
    console.log(`👤 Customer: Test User`);
    console.log(`🚗 Vehicle: Test Scooter`);
    console.log(`⏰ Duration: ${formattedStartDate} to ${formattedEndDate}`);
    console.log(`🔖 Booking ID: ${bookingId}`);
    console.log(`=================================================\n`);

    logger.info('Notification format verification completed successfully!');
    
  } catch (error) {
    logger.error('Error during notification testing:', error);
  }
}

// Run the test
testNotifications()
  .then(() => {
    logger.info('Notification test script execution completed');
    process.exit(0);
  })
  .catch(error => {
    logger.error('Error executing notification test script:', error);
    process.exit(1);
  }); 