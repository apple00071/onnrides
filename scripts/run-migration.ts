import pool from '../lib/db';
import fs from 'fs';
import path from 'path';

async function runMigration(migrationFile: string) {
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'migrations', migrationFile);
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // Connect to the database
    const client = await pool.connect();
    try {
      // Execute the SQL commands
      await client.query(sqlContent);
      console.log(`Migration ${migrationFile} executed successfully`);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Please provide a migration file name');
  process.exit(1);
}

runMigration(migrationFile);

// Add empty export to make it a module
export {}; 