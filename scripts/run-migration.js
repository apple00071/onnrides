const fs = require('fs');
const path = require('path');
const { query } = require('../lib/db.js');

async function runMigration() {
  try {
    console.log('Adding delivery-related columns to vehicles table...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../migrations/add_delivery_pricing_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the SQL
    await query(migrationSQL);
    
    console.log('Migration completed successfully!');
    
    // Verify the columns were added
    const result = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles' 
      AND column_name IN (
        'is_delivery_enabled',
        'delivery_price_7_days',
        'delivery_price_15_days',
        'delivery_price_30_days'
      )
      ORDER BY column_name
    `);
    
    console.log('Added columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}`);
    });
    
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration(); 