import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const runMigrate = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  // Use a raw connection to drop the existing tables
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  
  try {
    console.log('⏳ Preparing database...');
    
    // Drop existing tables in the correct order (respecting foreign key constraints)
    await sql`DROP TABLE IF EXISTS documents CASCADE`;
    await sql`DROP TABLE IF EXISTS bookings CASCADE`;
    await sql`DROP TABLE IF EXISTS vehicles CASCADE`;
    await sql`DROP TABLE IF EXISTS users CASCADE`;
    await sql`DROP TABLE IF EXISTS drizzle.migrations CASCADE`;
    await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
    
    console.log('✅ Existing tables dropped');
    
    // Initialize Drizzle
    const db = drizzle(sql);
    
    console.log('⏳ Running migrations...');
    const start = Date.now();
    await migrate(db, { migrationsFolder: 'drizzle' });
    const end = Date.now();
    
    console.log(`✅ Migrations completed in ${end - start}ms`);
  } catch (error) {
    console.error('Failed to run migrations:', error);
    throw error;
  } finally {
    await sql.end();
  }
  
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error('❌ Migration failed');
  console.error(err);
  process.exit(1);
}); 