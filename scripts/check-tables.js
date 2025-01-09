const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updateVehicleStatusConstraint() {
  const client = await pool.connect();
  try {
    // First, get the current constraint
    const constraintQuery = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as def
      FROM pg_constraint 
      WHERE conrelid = 'vehicles'::regclass 
      AND conname = 'vehicles_status_check';
    `);
    
    console.log('Current constraint:', constraintQuery.rows[0]?.def);

    // Drop the existing constraint
    await client.query(`
      ALTER TABLE vehicles
      DROP CONSTRAINT IF EXISTS vehicles_status_check;
    `);

    // Add new constraint with updated status values
    await client.query(`
      ALTER TABLE vehicles
      ADD CONSTRAINT vehicles_status_check
      CHECK (status IN ('available', 'unavailable', 'active', 'inactive', 'maintenance'));
    `);

    console.log('Successfully updated vehicles status constraint');
  } catch (error) {
    console.error('Error updating constraint:', error);
    throw error;
  } finally {
    client.release();
  }
}

updateVehicleStatusConstraint()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });