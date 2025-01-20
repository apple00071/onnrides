import { config } from 'dotenv';
import { sql } from '@vercel/postgres';

// Load environment variables
config();

async function updateVehiclePricing() {
  try {
    console.log('Adding price_per_hour column...');
    await sql`
      DO $$ 
      BEGIN 
        -- Add price_per_hour if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'vehicles' 
          AND column_name = 'price_per_hour'
        ) THEN
          ALTER TABLE vehicles
          ADD COLUMN price_per_hour DECIMAL(10,2) NOT NULL DEFAULT 0;
        END IF;

        -- Drop old columns if they exist
        IF EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'vehicles' 
          AND column_name = 'price_12hrs'
        ) THEN
          ALTER TABLE vehicles
          DROP COLUMN price_12hrs,
          DROP COLUMN price_24hrs,
          DROP COLUMN price_per_day,
          DROP COLUMN price_7days,
          DROP COLUMN price_15days,
          DROP COLUMN price_30days;
        END IF;
      END $$;
    `;

    console.log('Vehicle pricing structure updated successfully!');
  } catch (error) {
    console.error('Error updating vehicle pricing:', error);
    process.exit(1);
  }
}

updateVehiclePricing(); 