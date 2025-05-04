// Script to make database queries compatible with both camelCase and snake_case column names during build
require('dotenv').config();
const { Pool } = require('pg');

// Create a basic logger
const logger = {
  info: (...args) => console.info('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => console.debug('[DEBUG]', ...args)
};

// Database Connection Setup
const CONNECTION_STRING = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!CONNECTION_STRING) {
  throw new Error('No database connection string provided');
}

const pool = new Pool({
  connectionString: CONNECTION_STRING,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined
});

// Simple query function
async function query(text, params) {
  try {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    logger.debug('Executed query', {
      text: text.substring(0, 100) + '...',
      duration,
      rows: result.rowCount
    });

    return result;
  } catch (error) {
    logger.error('Database query error:', error);
    throw error;
  }
}

async function fixDatabaseForBuild() {
  logger.info('Starting database compatibility fix for build...');
  
  try {
    // Check which tables exist
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    logger.info('Found tables:', tables);
    
    if (tables.includes('vehicles')) {
      // Check which columns exist in vehicles table
      const vehicleColumnsResult = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'vehicles'
      `);
      
      const vehicleColumns = vehicleColumnsResult.rows.map(row => row.column_name);
      logger.info('Vehicle columns:', vehicleColumns);
      
      // Add missing columns if needed
      if (!vehicleColumns.includes('price_per_hour') && vehicleColumns.includes('pricePerHour')) {
        logger.info('Adding price_per_hour column to vehicles table');
        await query(`
          ALTER TABLE vehicles 
          ADD COLUMN price_per_hour NUMERIC DEFAULT 0
        `);
        
        await query(`
          UPDATE vehicles 
          SET price_per_hour = "pricePerHour"
        `);
      }
      
      if (!vehicleColumns.includes('min_booking_hours') && vehicleColumns.includes('minBookingHours')) {
        logger.info('Adding min_booking_hours column to vehicles table');
        await query(`
          ALTER TABLE vehicles 
          ADD COLUMN min_booking_hours INTEGER DEFAULT 1
        `);
        
        await query(`
          UPDATE vehicles 
          SET min_booking_hours = "minBookingHours"
        `);
      }
      
      if (!vehicleColumns.includes('is_available') && vehicleColumns.includes('isAvailable')) {
        logger.info('Adding is_available column to vehicles table');
        await query(`
          ALTER TABLE vehicles 
          ADD COLUMN is_available BOOLEAN DEFAULT TRUE
        `);
        
        await query(`
          UPDATE vehicles 
          SET is_available = "isAvailable"
        `);
      }
    }
    
    if (tables.includes('bookings')) {
      // Check which columns exist in bookings table
      const bookingsColumnsResult = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'bookings'
      `);
      
      const bookingsColumns = bookingsColumnsResult.rows.map(row => row.column_name);
      logger.info('Bookings columns:', bookingsColumns);
      
      // Add missing columns if needed
      if (!bookingsColumns.includes('user_id') && bookingsColumns.includes('userId')) {
        logger.info('Adding user_id column to bookings table');
        await query(`
          ALTER TABLE bookings 
          ADD COLUMN user_id TEXT
        `);
        
        await query(`
          UPDATE bookings 
          SET user_id = "userId"
        `);
      }
      
      if (!bookingsColumns.includes('vehicle_id') && bookingsColumns.includes('vehicleId')) {
        logger.info('Adding vehicle_id column to bookings table');
        await query(`
          ALTER TABLE bookings 
          ADD COLUMN vehicle_id TEXT
        `);
        
        await query(`
          UPDATE bookings 
          SET vehicle_id = "vehicleId"
        `);
      }
      
      if (!bookingsColumns.includes('booking_id') && bookingsColumns.includes('bookingId')) {
        logger.info('Adding booking_id column to bookings table');
        await query(`
          ALTER TABLE bookings 
          ADD COLUMN booking_id TEXT
        `);
        
        await query(`
          UPDATE bookings 
          SET booking_id = "bookingId"
        `);
      }
      
      if (!bookingsColumns.includes('total_price') && bookingsColumns.includes('totalPrice')) {
        logger.info('Adding total_price column to bookings table');
        await query(`
          ALTER TABLE bookings 
          ADD COLUMN total_price NUMERIC
        `);
        
        await query(`
          UPDATE bookings 
          SET total_price = "totalPrice"
        `);
      }
    }
    
    logger.info('Database compatibility setup completed successfully.');
    
    return { success: true, message: 'Database prepared for build compatibility.' };
  } catch (error) {
    logger.error('Error fixing database for build:', error);
    throw error;
  }
}

// Cleanup function
async function closePool() {
  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (error) {
    logger.error('Error closing database pool:', error);
  }
}

// Run the function if executed directly
if (require.main === module) {
  fixDatabaseForBuild()
    .then((result) => {
      logger.info('Database build compatibility completed:', result);
      closePool().then(() => process.exit(0));
    })
    .catch((error) => {
      logger.error('Database build compatibility failed:', error);
      closePool().then(() => process.exit(1));
    });
}

module.exports = { fixDatabaseForBuild }; 