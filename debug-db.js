
const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');

// Load env vars
if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
} else {
    dotenv.config({ path: '.env' });
}

console.log('Connecting to DB:', process.env.DATABASE_URL ? 'URL Found' : 'URL Missing');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        await client.connect();

        const resCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' AND column_name LIKE '%payment%';
    `);

        const res = await client.query(`
      SELECT id, status, payment_status, payment_method, payment_reference, total_price, booking_type, payment_details 
      FROM bookings 
      ORDER BY created_at DESC 
      LIMIT 1;
    `);

        const output = {
            columns: resCols.rows,
            latestBooking: res.rows.length > 0 ? res.rows[0] : null
        };
        fs.writeFileSync('booking_debug.json', JSON.stringify(output, null, 2));
        console.log('Debug data written to booking_debug.json');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
