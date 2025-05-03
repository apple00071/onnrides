import { query } from '../lib/db';
import logger from '../lib/logger';

async function addDeliveryColumns() {
  try {
    logger.info('Adding delivery-related columns to vehicles table...');
    
    // Check if columns exist
    const checkResult = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles' 
      AND column_name IN (
        'is_delivery_enabled',
        'delivery_price_7_days',
        'delivery_price_15_days',
        'delivery_price_30_days'
      )
    `);

    const existingColumns = checkResult.rows.map(row => row.column_name);
    logger.info('Existing columns:', existingColumns);

    // Add is_delivery_enabled if it doesn't exist
    if (!existingColumns.includes('is_delivery_enabled')) {
      logger.info('Adding is_delivery_enabled column');
      await query(`ALTER TABLE vehicles ADD COLUMN "is_delivery_enabled" BOOLEAN NOT NULL DEFAULT false`);
    }

    // Add delivery_price_7_days if it doesn't exist
    if (!existingColumns.includes('delivery_price_7_days')) {
      logger.info('Adding delivery_price_7_days column');
      await query(`ALTER TABLE vehicles ADD COLUMN "delivery_price_7_days" DECIMAL(10,2) NULL`);
    }

    // Add delivery_price_15_days if it doesn't exist
    if (!existingColumns.includes('delivery_price_15_days')) {
      logger.info('Adding delivery_price_15_days column');
      await query(`ALTER TABLE vehicles ADD COLUMN "delivery_price_15_days" DECIMAL(10,2) NULL`);
    }

    // Add delivery_price_30_days if it doesn't exist
    if (!existingColumns.includes('delivery_price_30_days')) {
      logger.info('Adding delivery_price_30_days column');
      await query(`ALTER TABLE vehicles ADD COLUMN "delivery_price_30_days" DECIMAL(10,2) NULL`);
    }

    // Verify the columns were added
    const verifyResult = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles' 
      AND column_name IN (
        'is_delivery_enabled',
        'delivery_price_7_days',
        'delivery_price_15_days',
        'delivery_price_30_days'
      )
      ORDER BY column_name
    `);
    
    logger.info('Columns after migration:');
    verifyResult.rows.forEach(row => {
      logger.info(`- ${row.column_name}`);
    });
    
    logger.info('Migration completed successfully!');
  } catch (error) {
    logger.error('Error running migration:', error);
    process.exit(1);
  }
}

// Run the migration
addDeliveryColumns(); 