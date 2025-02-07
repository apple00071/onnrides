import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';

async function runMigration() {
  const pool = new Pool({
    connectionString: "postgres://neondb_owner:fpBXEsTct9g1@ep-long-dream-a6avbuml-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require"
  });

  try {
    const sql = await fs.readFile(path.join(__dirname, 'add_order_id_to_payments.sql'), 'utf-8');
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