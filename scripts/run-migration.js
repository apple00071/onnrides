const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: 'postgres',
  password: 'Sulochana8%',
  host: 'localhost',
  port: 5432,
  database: 'onnrides'
});

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Read and execute the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '019_add_profile_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(migrationSQL);
    console.log('Migration executed successfully');

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  }); 