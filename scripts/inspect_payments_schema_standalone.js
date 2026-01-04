
const { Pool } = require('pg');

async function checkSchema() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Checking activity_logs table schema...');

        // First check if table exists
        const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'settings'
      );
    `);

        if (!tableCheck.rows[0].exists) {
            console.log('settings table does not exist.');
            return;
        }

        const result = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'settings';
    `);

        console.log('Columns in activity_logs table:');
        result.rows.forEach(row => {
            console.log(`- ${row.column_name} (${row.data_type})`);
        });

        // Also fetch one row to see sample data if possible
        const sample = await pool.query('SELECT * FROM payments LIMIT 1');
        if (sample.rows.length > 0) {
            console.log('Sample row keys:', Object.keys(sample.rows[0]));
        } else {
            console.log('No data in payments table.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkSchema();
