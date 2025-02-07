import { Pool } from 'pg';

async function checkColumns() {
  const pool = new Pool({
    connectionString: "postgres://neondb_owner:fpBXEsTct9g1@ep-long-dream-a6avbuml-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require"
  });

  try {
    // Check column names in bookings table
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bookings'
      ORDER BY ordinal_position;
    `);
    
    console.log('Bookings table columns:', result.rows);

    // Also check a specific booking to see its data
    const bookingResult = await pool.query(`
      SELECT * FROM bookings 
      WHERE id = 'order_PsM1n2fjGj1diA'
      LIMIT 1;
    `);
    
    console.log('\nSample booking data:', bookingResult.rows[0]);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkColumns(); 