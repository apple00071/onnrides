const pg = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function enforceUniqueReference() {
    console.log('Enforcing unique reference on payments table...');

    try {
        const migrationSql = `
      -- 1. Remove any potential duplicates first (keep the oldest one)
      DELETE FROM payments a USING payments b
      WHERE a.id > b.id 
      AND a.reference = b.reference 
      AND a.reference IS NOT NULL;

      -- 2. Add Unique constraint
      ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_reference_key;
      ALTER TABLE payments ADD CONSTRAINT payments_reference_key UNIQUE (reference);
    `;

        await pool.query(migrationSql);
        console.log('Unique constraint added successfully!');
    } catch (error) {
        console.error('Failed to add unique constraint:', error);
    } finally {
        await pool.end();
    }
}

enforceUniqueReference();
