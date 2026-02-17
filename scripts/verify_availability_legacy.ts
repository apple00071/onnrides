import { checkVehicleAvailability } from './lib/bookings/availability';
import { query } from './lib/db';
import * as fs from 'fs';

async function testAvailability() {
    const logStream = fs.createWriteStream('verify_results.txt', { encoding: 'utf8' });
    const log = (msg: string) => {
        console.log(msg);
        logStream.write(msg + '\n');
    };

    log('--- Testing Availability Check (TS) ---');

    try {
        // 1. Get a vehicle ID to test with
        const vehicleResult = await query('SELECT id FROM vehicles LIMIT 1');
        if (vehicleResult.rows.length === 0) {
            log('No vehicles found in database to test with.');
            return;
        }
        const vehicleId = vehicleResult.rows[0].id;

        // 1b. Get a user ID to test with
        const userResult = await query('SELECT id FROM users LIMIT 1');
        if (userResult.rows.length === 0) {
            log('No users found in database to test with.');
            return;
        }
        const userId = userResult.rows[0].id;
        log(`Using vehicle: ${vehicleId}, user: ${userId}`);

        // 2. Create a dummy booking for testing
        const start = new Date('2026-06-01T10:00:00');
        const end = new Date('2026-06-05T10:00:00');

        log(`Creating test booking: ${start.toISOString()} to ${end.toISOString()}`);

        // Clean up any existing test bookings first
        await query("DELETE FROM bookings WHERE customer_name = 'TEST_AVAILABILITY_CHECK'");

        const testBookingId = '00000000-0000-0000-0000-000000000000';
        await query(`
      INSERT INTO bookings (id, vehicle_id, user_id, start_date, end_date, total_hours, total_price, total_amount, customer_name, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [testBookingId, vehicleId, userId, start, end, 96, 1000, 1000, 'TEST_AVAILABILITY_CHECK', 'confirmed']);

        // 3. Run tests
        const tests = [
            { name: 'Exact Overlap', s: '2026-06-01T10:00:00', e: '2026-06-05T10:00:00', expect: false },
            { name: 'Starts Inside', s: '2026-06-02T10:00:00', e: '2026-06-06T10:00:00', expect: false },
            { name: 'Ends Inside', s: '2026-05-31T10:00:00', e: '2026-06-02T10:00:00', expect: false },
            { name: 'Fully Inside', s: '2026-06-02T10:00:00', e: '2026-06-04T10:00:00', expect: false },
            { name: 'Encapsulates', s: '2026-05-30T10:00:00', e: '2026-06-06T10:00:00', expect: false },
            { name: 'Immediately After (Should pass)', s: '2026-06-05T10:00:00', e: '2026-06-07T10:00:00', expect: true },
            { name: 'Immediately Before (Should pass)', s: '2026-05-29T10:00:00', e: '2026-06-01T10:00:00', expect: true },
            { name: 'Exclude current (Should pass)', s: '2026-06-01T10:00:00', e: '2026-06-05T10:00:00', expect: true, exclude: testBookingId }
        ];

        for (const t of tests) {
            const isAvail = await checkVehicleAvailability(vehicleId, t.s, t.e, t.exclude);
            const passed = isAvail === t.expect;
            log(`${passed ? 'PASS' : 'FAIL'} ${t.name}: Expected ${t.expect}, Got ${isAvail}`);
        }

        // 4. Cleanup
        await query("DELETE FROM bookings WHERE customer_name = 'TEST_AVAILABILITY_CHECK'");
        log('--- Test Complete ---');
    } catch (err) {
        log('ERROR: ' + (err instanceof Error ? err.stack : String(err)));
    } finally {
        logStream.end();
    }
}

testAvailability().catch(console.error).finally(() => {
    setTimeout(() => process.exit(), 500); // Give stream time to close
});
