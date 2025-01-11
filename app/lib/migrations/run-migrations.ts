import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : undefined
  });

  try {
    // Create database if it doesn't exist
    await pool.query(`
      CREATE DATABASE IF NOT EXISTS onnrides;
    `);

    // Read and execute migration file
    const migrationPath = path.join(__dirname, '001_initial.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(migration);
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
  } finally {
    await pool.end();
  }
}

runMigrations().catch(console.error); 