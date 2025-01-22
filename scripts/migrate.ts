import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  const db = new Database('sqlite.db');

  // Read and execute migration files
  const migrationFiles = [
    '0002_add_payment_details.sql'
  ];

  for (const file of migrationFiles) {
    console.log(`Running migration: ${file}`);
    const filePath = path.join(process.cwd(), 'drizzle', file);
    const migration = fs.readFileSync(filePath, 'utf8');
    db.exec(migration);
  }

  console.log('Migrations completed successfully!');
  db.close();
}

runMigration().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
}); 