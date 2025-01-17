import { sql } from '@vercel/postgres';
import 'dotenv/config';

async function addQuantityColumn() {
  try {
    console.log('Setting up vehicles table...');
    
    // Add quantity column if it doesn't exist
    await sql.query(`
      ALTER TABLE vehicles 
      ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
    `);
    
    console.log('Quantity column added successfully!');
  } catch (error) {
    console.error('Error adding quantity column:', error);
    process.exit(1);
  }
}

addQuantityColumn(); 