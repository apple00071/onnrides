const { query } = require('./lib/db');
const logger = require('./lib/logger');

async function debugBooking() {
    try {
        const result = await query("SELECT id, booking_id, vehicle_id, start_date, end_date, pickup_location, total_price, status, payment_status FROM bookings WHERE booking_id LIKE 'ORNF4%' OR id = 'ORNF4'");
        console.log('--- DEBUG BOOKING ORNF4 ---');
        console.log(JSON.stringify(result.rows, null, 2));

        if (result.rows.length > 0) {
            const vehicleId = result.rows[0].vehicle_id;
            const vehicleRes = await query("SELECT id, name, location FROM vehicles WHERE id = $1", [vehicleId]);
            console.log('--- VEHICLE DETAILS ---');
            console.log(JSON.stringify(vehicleRes.rows, null, 2));
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

debugBooking();
