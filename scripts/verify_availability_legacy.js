const { checkVehicleAvailability } = require('./lib/bookings/availability');
const { query } = require('./lib/db');

async function testAvailability() {
    console.log('--- Testing Availability Check ---');

    // 1. Get a vehicle ID to test with
    const vehicleResult = await query('SELECT id FROM vehicles LIMIT 1');
    if (vehicleResult.rows.length === 0) {
        console.error('No vehicles found in database to test with.');
        return;
    }
    const vehicleId = vehicleResult.rows[0].id;
    console.log(`Using vehicle: ${vehicleId}`);

    // 2. Create a dummy booking for testing
    const start = new Date('2026-06-01T10:00:00');
    const end = new Date('2026-06-05T10:00:00');

    console.log(`Creating test booking: ${start.toISOString()} to ${end.toISOString()}`);

    // Clean up any existing test bookings first
    await query("DELETE FROM bookings WHERE customer_name = 'TEST_AVAILABILITY_CHECK'");

    const testBookingId = '00000000-0000-0000-0000-000000000000';
    await query(`
    INSERT INTO bookings (id, vehicle_id, start_date, end_date, customer_name, status)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [testBookingId, vehicleId, start, end, 'TEST_AVAILABILITY_CHECK', 'confirmed']);

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
        console.log(`${passed ? '✅' : '❌'} ${t.name}: Expected ${t.expect}, Got ${isAvail}`);
    }

    // 4. Cleanup
    await query("DELETE FROM bookings WHERE customer_name = 'TEST_AVAILABILITY_CHECK'");
    console.log('--- Test Complete ---');
}

testAvailability().catch(console.error).finally(() => process.exit());
