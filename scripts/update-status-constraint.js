const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateStatusConstraint() {
  const client = await pool.connect();
  try {
    // Drop the existing constraint
    await client.query(`
      ALTER TABLE vehicles
      DROP CONSTRAINT IF EXISTS vehicles_status_check;
    `);

    // Add new constraint with correct status values
    await client.query(`
      ALTER TABLE vehicles
      ADD CONSTRAINT vehicles_status_check
      CHECK (status IN ('active', 'unavailable', 'maintenance'));
    `);

    // Update any existing records to use 'active' instead of 'available'
    await client.query(`
      UPDATE vehicles
      SET status = 'active'
      WHERE status = 'available';
    `);

    console.log('Successfully updated status constraint and existing records');
  } catch (error) {
    console.error('Error updating status constraint:', error);
    throw error;
  } finally {
    client.release();
  }
}

updateStatusConstraint()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  }); 