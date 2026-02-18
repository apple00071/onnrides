import { query } from '../lib/db';
import logger from '../lib/logger';

async function checkSchema() {
    const tables = ['bookings', 'email_logs', 'whatsapp_logs', 'vehicles'];

    for (const table of tables) {
        try {
            const result = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [table]);

            console.log(`\n--- Schema for table: ${table} ---`);
            if (result.rows.length === 0) {
                console.log('Table not found or no columns.');
            } else {
                result.rows.forEach(row => {
                    console.log(`${row.column_name}: ${row.data_type}`);
                });
            }
        } catch (error) {
            console.error(`Error checking schema for ${table}:`, error);
        }
    }
    process.exit(0);
}

checkSchema();
