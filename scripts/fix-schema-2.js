const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();

// Create a new pool using the connection string
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL_NON_POOLING,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixSchema() {
  const client = await pool.connect();
  try {
    console.log('Fixing database schema...\n');

    // Start transaction
    await client.query('BEGIN');

    // Fix bookings table
    console.log('Fixing bookings table...');
    await client.query(`
      -- Rename date columns
      ALTER TABLE bookings 
      RENAME COLUMN start_date TO pickup_datetime;

      ALTER TABLE bookings 
      RENAME COLUMN end_date TO dropoff_datetime;

      -- Rename amount column
      ALTER TABLE bookings 
      RENAME COLUMN amount TO total_amount;
    `);

    // Fix profiles table
    console.log('Fixing profiles table...');
    await client.query(`
      -- Rename phone column if it exists
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'profiles' 
          AND column_name = 'phone'
        ) THEN
          ALTER TABLE profiles 
          RENAME COLUMN phone TO phone_number;
        END IF;
      END $$;
    `);

    // Commit transaction
    await client.query('COMMIT');
    console.log('\n✅ Database schema fixed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fixing schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

fixSchema()
  .catch((err) => {
    console.error('Failed to fix schema:', err);
    process.exit(1);
  }); 