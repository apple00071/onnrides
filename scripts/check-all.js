const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkAll() {
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT * FROM vehicles LIMIT 1");
        if (res.rows.length === 0) {
            console.log('No vehicles found');
            return;
        }
        const row = res.rows[0];
        console.log('--- Column Names ---');
        console.log(Object.keys(row).join(', '));

        // Log content of interesting columns
        ['images', 'location', 'available_locations', 'image_url', 'image'].forEach(col => {
            if (row[col] !== undefined) {
                console.log(`\n[${col}]`);
                console.log('Type:', typeof row[col]);
                console.log('Value:', JSON.stringify(row[col]));
            }
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkAll();
