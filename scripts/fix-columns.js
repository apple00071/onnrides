import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: "postgres://neondb_owner:fpBXEsTct9g1@ep-long-dream-a6avbuml-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require"
});

async function fixColumns() {
  const client = await pool.connect();
  try {
    console.log('Starting database fixes...');
    
    // Start transaction
    await client.query('BEGIN');

    // 1. Rename phone_number to phone in profiles table
    console.log('Renaming phone_number to phone in profiles table...');
    await client.query(`
      ALTER TABLE profiles 
      RENAME COLUMN phone_number TO phone;
    `);

    // 2. Add amount column to bookings table
    console.log('Adding amount column to bookings table...');
    await client.query(`
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS amount NUMERIC NOT NULL DEFAULT 0;
    `);

    // 3. Add status column to vehicles table
    console.log('Adding status column to vehicles table...');
    await client.query(`
      ALTER TABLE vehicles 
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
    `);

    // Commit transaction
    await client.query('COMMIT');
    console.log('All database fixes completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fixing database:', error);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
}

fixColumns().catch(err => {
  console.error('Failed to fix database:', err);
  process.exit(1);
}); 