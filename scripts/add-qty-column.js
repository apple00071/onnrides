const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addQuantityColumn() {
  const client = await pool.connect();
  try {
    // Add quantity column with default value 1
    await client.query(`
      ALTER TABLE vehicles 
      ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1 CHECK (quantity > 0);
    `);

    // Update locations column to be an array
    await client.query(`
      ALTER TABLE vehicles 
      ALTER COLUMN location TYPE TEXT[] USING ARRAY[location],
      ALTER COLUMN location SET DEFAULT '{}';
    `);

    console.log('Successfully added quantity column and updated location column to array type');
  } catch (error) {
    console.error('Error modifying table:', error);
    throw error;
  } finally {
    client.release();
  }
}

addQuantityColumn()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  }); 