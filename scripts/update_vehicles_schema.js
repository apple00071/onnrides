
const { Pool } = require('pg');

async function migrateVehicles() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Adding missing columns to vehicles table...');

        await pool.query(`
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS location_quantities JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS is_delivery_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS delivery_price_7_days NUMERIC DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS delivery_price_15_days NUMERIC DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS delivery_price_30_days NUMERIC DEFAULT NULL;
    `);

        console.log('Vehicles table updated successfully.');

    } catch (error) {
        console.error('Error updating vehicles table:', error);
    } finally {
        await pool.end();
    }
}

migrateVehicles();
