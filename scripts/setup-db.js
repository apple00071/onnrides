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

    // Split the migration into separate statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Run each statement separately
    for (const statement of statements) {
      try {
        await sql.query(statement + ';');
        console.log('Successfully executed:', statement.substring(0, 50) + '...');
      } catch (error) {
        console.error('Error executing statement:', statement.substring(0, 50) + '...');
        console.error('Error details:', error);
        // Continue with next statement instead of failing completely
      }
    }

    console.log('Database migrations completed');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations(); 