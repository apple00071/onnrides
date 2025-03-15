import { config } from 'dotenv';
import { resolve } from 'path';
import { query } from '../lib/db';
import logger from '../lib/logger';
import { formatIST, toIST } from '../lib/utils/time-formatter';

// Load environment variables
const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

async function fixBookingDates() {
  logger.info('Starting booking date fix script...');
  
  try {
    // 1. First, check and add missing columns
    logger.info('Checking for missing columns...');
    
    // Check if columns exist
    const columnsResult = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
        AND column_name IN (
          'pickup_datetime', 
          'dropoff_datetime', 
          'formatted_start_date', 
          'formatted_end_date', 
          'formatted_pickup', 
          'formatted_dropoff'
        )
    `);
    
    const existingColumns = columnsResult.rows.map(row => row.column_name);
    logger.info(`Existing columns: ${existingColumns.join(', ')}`);
    
    // Add missing columns
    const requiredColumns = [
      { name: 'pickup_datetime', type: 'TIMESTAMP WITH TIME ZONE' },
      { name: 'dropoff_datetime', type: 'TIMESTAMP WITH TIME ZONE' },
      { name: 'formatted_start_date', type: 'TEXT' },
      { name: 'formatted_end_date', type: 'TEXT' },
      { name: 'formatted_pickup', type: 'TEXT' },
      { name: 'formatted_dropoff', type: 'TEXT' }
    ];
    
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col.name));
    
    if (missingColumns.length > 0) {
      logger.info(`Adding missing columns: ${missingColumns.map(c => c.name).join(', ')}`);
      
      for (const column of missingColumns) {
        await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
      }
      
      logger.info('Missing columns added successfully');
    } else {
      logger.info('All required columns already exist');
    }
    
    // 2. Get all bookings
    logger.info('Fetching bookings...');
    const bookingsResult = await query(`
      SELECT 
        id, 
        booking_id, 
        start_date, 
        end_date, 
        ${existingColumns.includes('pickup_datetime') ? 'pickup_datetime,' : ''} 
        ${existingColumns.includes('dropoff_datetime') ? 'dropoff_datetime,' : ''} 
        created_at,
        updated_at
      FROM bookings
    `);
    
    const bookings = bookingsResult.rows;
    logger.info(`Found ${bookings.length} bookings to process`);
    
    // 3. Process each booking
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const booking of bookings) {
      try {
        // Check if we need to update pickup/dropoff fields
        const needsPickupDropoffUpdate = (!booking.pickup_datetime && booking.start_date) || 
                                        (!booking.dropoff_datetime && booking.end_date);
        
        // Format dates consistently in IST
        const startDateIST = booking.start_date ? toIST(new Date(booking.start_date)) : null;
        const endDateIST = booking.end_date ? toIST(new Date(booking.end_date)) : null;
        const pickupDatetimeIST = booking.pickup_datetime ? toIST(new Date(booking.pickup_datetime)) : startDateIST;
        const dropoffDatetimeIST = booking.dropoff_datetime ? toIST(new Date(booking.dropoff_datetime)) : endDateIST;
        
        // Skip if all dates are null or invalid
        if (!startDateIST && !endDateIST && !pickupDatetimeIST && !dropoffDatetimeIST) {
          logger.warn(`Skipping booking ${booking.id} - all dates are null or invalid`);
          continue;
        }
        
        // Prepare update query
        let updateFields = [];
        let params = [];
        let paramIndex = 1;
        
        // Always update formatted fields
        updateFields.push(`formatted_start_date = $${paramIndex}`);
        params.push(startDateIST ? formatIST(startDateIST) : null);
        paramIndex++;
        
        updateFields.push(`formatted_end_date = $${paramIndex}`);
        params.push(endDateIST ? formatIST(endDateIST) : null);
        paramIndex++;
        
        updateFields.push(`formatted_pickup = $${paramIndex}`);
        params.push(pickupDatetimeIST ? formatIST(pickupDatetimeIST) : null);
        paramIndex++;
        
        updateFields.push(`formatted_dropoff = $${paramIndex}`);
        params.push(dropoffDatetimeIST ? formatIST(dropoffDatetimeIST) : null);
        paramIndex++;
        
        // If pickup/dropoff fields are missing but start/end dates exist, update them
        if (needsPickupDropoffUpdate) {
          if (!booking.pickup_datetime && booking.start_date) {
            updateFields.push(`pickup_datetime = $${paramIndex}`);
            params.push(startDateIST ? startDateIST.toISOString() : null);
            paramIndex++;
          }
          
          if (!booking.dropoff_datetime && booking.end_date) {
            updateFields.push(`dropoff_datetime = $${paramIndex}`);
            params.push(endDateIST ? endDateIST.toISOString() : null);
            paramIndex++;
          }
        }
        
        // Add booking ID to params
        params.push(booking.id);
        
        // Execute update
        await query(`
          UPDATE bookings 
          SET ${updateFields.join(', ')}, 
              updated_at = NOW() 
          WHERE id = $${paramIndex}
        `, params);
        
        updatedCount++;
        
        // Log progress every 100 bookings
        if (updatedCount % 100 === 0) {
          logger.info(`Processed ${updatedCount} bookings so far`);
        }
      } catch (error) {
        logger.error(`Error updating booking ${booking.id}:`, error);
        errorCount++;
      }
    }
    
    logger.info(`Booking date fix completed. Updated: ${updatedCount}, Errors: ${errorCount}`);
    process.exit(0);
  } catch (error) {
    logger.error('Error in booking date fix script:', error);
    process.exit(1);
  }
}

// Run the script
fixBookingDates(); 