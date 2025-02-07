import { Pool } from 'pg';

async function checkUser() {
  const pool = new Pool({
    connectionString: "postgres://neondb_owner:fpBXEsTct9g1@ep-long-dream-a6avbuml-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require"
  });

  try {
    const userId = '0c2c4413-dc9a-4255-9f4d-510b06885c33';
    
    // Check if user exists
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      console.log('User not found');
    } else {
      console.log('User found:', userResult.rows[0]);
    }

    // Also check the bookings table
    const bookingResult = await pool.query(
      'SELECT * FROM bookings WHERE user_id = $1',
      [userId]
    );

    console.log('Related bookings:', bookingResult.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkUser(); 