const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addIsAvailableColumn() {
  const client = await pool.connect();
  try {
    // Add is_available column with default value true
    await client.query(`
      ALTER TABLE vehicles 
      ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;
    `);
    
    // Update existing records to sync is_available with status
    await client.query(`
      UPDATE vehicles 
      SET is_available = (status = 'available' OR status = 'active')
      WHERE is_available IS NULL;
    `);

    console.log('Successfully added is_available column to vehicles table');
  } catch (error) {
    console.error('Error adding is_available column:', error);
    throw error;
  } finally {
    client.release();
  }
}

addIsAvailableColumn()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  }); 