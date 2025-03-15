import { config } from 'dotenv';
import { resolve } from 'path';
import { query } from '../lib/db';
import logger from '../lib/logger';

// Load environment variables
const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

async function checkBookings() {
  logger.info('Checking bookings with formatted dates...');
  
  try {
    // Get a sample of bookings with formatted dates
    const result = await query(`
      SELECT 
        id, 
        booking_id, 
        start_date, 
        end_date, 
        pickup_datetime, 
        dropoff_datetime,
        formatted_start_date, 
        formatted_end_date, 
        formatted_pickup, 
        formatted_dropoff
      FROM bookings
      LIMIT 5
    `);
    
    const bookings = result.rows;
    
    if (bookings.length === 0) {
      logger.info('No bookings found');
      process.exit(0);
    }
    
    logger.info(`Found ${bookings.length} bookings`);
    
    // Display the bookings
    bookings.forEach((booking, index) => {
      logger.info(`Booking ${index + 1}:`, {
        id: booking.id,
        booking_id: booking.booking_id,
        dates: {
          start_date: booking.start_date,
          end_date: booking.end_date,
          pickup_datetime: booking.pickup_datetime,
          dropoff_datetime: booking.dropoff_datetime
        },
        formatted: {
          formatted_start_date: booking.formatted_start_date,
          formatted_end_date: booking.formatted_end_date,
          formatted_pickup: booking.formatted_pickup,
          formatted_dropoff: booking.formatted_dropoff
        }
      });
    });
    
    process.exit(0);
  } catch (error) {
    logger.error('Error checking bookings:', error);
    process.exit(1);
  }
}

// Run the script
checkBookings(); 