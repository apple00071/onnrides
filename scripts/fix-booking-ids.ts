import { query } from '../lib/db';
import { generateBookingId } from '../lib/utils/booking-id';

async function fixMissingBookingIds() {
    try {
        console.log('Fetching bookings with missing booking_id...');
        const result = await query(
            "SELECT id, booking_id FROM bookings WHERE booking_id IS NULL OR booking_id = '' OR booking_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'"
        );

        console.log(`Found ${result.rows.length} bookings to fix.`);

        for (const row of result.rows) {
            const displayId = generateBookingId();
            console.log(`Updating booking ${row.id} with new display ID: ${displayId}`);
            await query(
                'UPDATE bookings SET booking_id = $1 WHERE id = $2',
                [displayId, row.id]
            );
        }

        console.log('Finished fixing booking IDs.');
    } catch (error) {
        console.error('Error fixing booking IDs:', error);
    } finally {
        process.exit(0);
    }
}

fixMissingBookingIds();
