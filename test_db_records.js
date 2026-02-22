const { query } = require('./lib/db');

async function main() {
  try {
    console.log('--- LATEST PAYMENT ---');
    const paymentRes = await query('SELECT * FROM payments ORDER BY created_at DESC LIMIT 1');
    console.log(paymentRes.rows[0]);

    console.log('\n--- LATEST BOOKING ---');
    const bookingRes = await query('SELECT * FROM bookings ORDER BY created_at DESC LIMIT 1');
    console.log(bookingRes.rows[0]);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();
