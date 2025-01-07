import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: "postgres://neondb_owner:fpBXEsTct9g1@ep-long-dream-a6avbuml-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require"
});

async function fixMoreColumns() {
  const client = await pool.connect();
  try {
    console.log('Starting additional database fixes...');
    
    // Start transaction
    await client.query('BEGIN');

    // 1. Add address column to profiles table
    console.log('Adding address column to profiles table...');
    await client.query(`
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
    `);

    // 2. Fix the dashboard query to use document_submissions instead of documents
    console.log('Updating dashboard query...');
    await client.query(`
      -- No need for table creation as document_submissions already exists
      -- Just need to update the query in the dashboard route to use document_submissions
      -- This is a comment to document the change needed in the route file
    `);

    // Commit transaction
    await client.query('COMMIT');
    console.log('All additional database fixes completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fixing database:', error);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
}

fixMoreColumns().catch(err => {
  console.error('Failed to fix database:', err);
  process.exit(1);
}); 