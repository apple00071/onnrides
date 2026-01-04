
import { query } from '../lib/db';

async function checkSchema() {
    try {
        console.log('Checking payments table schema...');
        const result = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'payments';
    `);

        console.log('Columns in payments table:');
        result.rows.forEach(row => {
            console.log(`- ${row.column_name} (${row.data_type})`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkSchema();
