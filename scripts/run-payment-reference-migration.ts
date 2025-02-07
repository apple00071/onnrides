import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgres://neondb_owner:fpBXEsTct9g1@ep-long-dream-a6avbuml-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require"
  });

  try {
    const sql = await fs.readFile(path.join(__dirname, '..', 'migrations', 'add_payment_reference_to_bookings.sql'), 'utf-8');
    await pool.query(sql);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration(); 