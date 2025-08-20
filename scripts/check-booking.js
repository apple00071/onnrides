const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('ssl=require') ? { rejectUnauthorized: false } : false
});

async function checkLatestBooking() {
  try {
    const result = await pool.query(`
      SELECT 
        b.id,
        b.booking_id,
        b.user_id,
        b.vehicle_id,
        b.start_date,
        b.end_date,
        b.total_hours,
        b.total_price,
        b.status,
        b.payment_status,
        b.created_at,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        v.name as vehicle_name
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      ORDER BY b.created_at DESC
      LIMIT 1
    `);

    if (result.rows.length > 0) {
      console.log('Latest booking:', result.rows[0]);
    } else {
      console.log('No bookings found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkLatestBooking(); 