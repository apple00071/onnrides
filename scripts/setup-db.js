const { sql } = require('@vercel/postgres');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  try {
    console.log('Starting database migrations...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../lib/migrations/001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Run the migrations
    await sql.query(migrationSQL);

    console.log('Database migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations(); 