import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: "postgres://neondb_owner:fpBXEsTct9g1@ep-long-dream-a6avbuml-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require"
});

async function addColumns() {
  try {
    const client = await pool.connect();
    
    console.log('Adding missing columns to profiles table...');
    
    await client.query(`
      ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS is_documents_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
    `);
    
    console.log('Columns added successfully!');
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('Error adding columns:', error);
    process.exit(1);
  }
}

addColumns(); 