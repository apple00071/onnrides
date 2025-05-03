// Script to check the columns in the vehicles table
const { Pool } = require('pg');
require('dotenv').config();

// Create a database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

async function checkColumns() {
  try {
    console.log('Database URL:', process.env.DATABASE_URL || process.env.POSTGRES_URL);
    
    // Query to get the column information from the vehicles table
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Columns in vehicles table:');
    console.table(result.rows);
    
    console.log('\nChecking for specific pricing columns:');
    const pricingColumns = [
      'price_7_days',
      'price_15_days',
      'price_30_days',
      'delivery_price_7_days',
      'delivery_price_15_days',
      'delivery_price_30_days'
    ];
    
    pricingColumns.forEach(col => {
      const found = result.rows.some(row => row.column_name === col);
      console.log(`${col}: ${found ? 'EXISTS' : 'MISSING'}`);
    });
  } catch (error) {
    console.error('Error checking columns:', error);
  } finally {
    await pool.end();
  }
}

checkColumns(); 