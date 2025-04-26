import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log('Using DATABASE_URL (truncated):', DATABASE_URL.substring(0, 30) + '...');

// Create a new PostgreSQL pool with explicit ssl configuration
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixDatabase() {
  console.log('Starting database fix...');

  try {
    // Test connection
    console.log('Testing database connection...');
    const res = await pool.query('SELECT NOW()');
    console.log('Database connection successful. Server time:', res.rows[0].now);

    // Step 1: Drop all tables
    console.log('Step 1: Dropping all tables...');
    await pool.query(`
      DO $$ 
      DECLARE
          tables CURSOR FOR
              SELECT tablename FROM pg_tables
              WHERE schemaname = 'public';
          r RECORD;
      BEGIN
          FOR r IN tables LOOP
              EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
      END $$;
    `);
    console.log('All tables dropped successfully');

    // Step 2: Create pgcrypto extension if needed
    console.log('Step 2: Enabling pgcrypto extension...');
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    console.log('pgcrypto extension enabled');

    // Step 3: Create tables with UUID columns
    console.log('Step 3: Creating tables with UUID columns...');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'prisma/migrations/20250423_fix_all_uuid_columns/migration.sql'),
      'utf8'
    );
    
    await pool.query(migrationSQL);
    console.log('Tables created successfully with UUID columns');

    // Step 4: Generate Prisma client
    console.log('Step 4: Schema fixed, database ready for use');
    console.log('Please run: npx prisma generate');

    console.log('Database fix completed successfully');
  } catch (error) {
    console.error('Database fix failed:', error);
  } finally {
    await pool.end();
  }
}

// Execute the script
fixDatabase().catch(error => {
  console.error('Unhandled error during database fix:', error);
  process.exit(1);
}); 