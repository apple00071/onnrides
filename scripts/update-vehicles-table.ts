import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function updateVehiclesTable() {
  try {
    // Drop and recreate only the vehicles table
    await sql.query(`DROP TABLE IF EXISTS vehicles CASCADE;`);
    
    await sql.query(`
      CREATE TABLE vehicles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        price_per_day INTEGER NOT NULL,
        location JSONB NOT NULL,
        images JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Successfully updated vehicles table schema');
  } catch (error) {
    console.error('Error updating database schema:', error);
    process.exit(1);
  }
}

updateVehiclesTable(); 