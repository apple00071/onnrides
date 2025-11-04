const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_rmT3YZLKSD1w@ep-red-union-ad764p71-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  try {
    console.log('Running security deposit fields migration...');
    
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '..', 'migrations', 'add_security_deposit_fields.sql'),
      'utf8'
    );
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('Added security deposit fields to vehicle_returns table:');
    console.log('- security_deposit_deductions');
    console.log('- security_deposit_refund_amount');
    console.log('- security_deposit_refund_method');
    console.log('- deduction_reasons');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
