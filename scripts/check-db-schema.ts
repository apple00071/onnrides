
import { query } from '../lib/db';
import logger from '../lib/logger';

async function checkSchema() {
    console.log('Checking bookings table schema...');
    try {
        const result = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bookings'
      AND column_name IN ('id', 'booking_id');
    `);

        console.table(result.rows);
    } catch (error) {
        console.error('Error querying schema:', error);
    } finally {
        process.exit(0);
    }
}

checkSchema();
