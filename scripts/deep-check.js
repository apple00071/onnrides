const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function deepCheck() {
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT id, name, images, location, available_locations FROM vehicles WHERE name ILIKE '%Activa%' LIMIT 1");
        if (res.rows.length === 0) {
            console.log('No Activa found');
            return;
        }
        const row = res.rows[0];
        console.log('--- Raw Data for Activa ---');
        console.log('IMAGES:', JSON.stringify(row.images));
        console.log('LOCATION:', JSON.stringify(row.location));
        console.log('AVAILABLE_LOCATIONS:', JSON.stringify(row.available_locations));

        // Test parsing logic
        const parse = (val) => {
            if (!val) return 'EMPTY';
            try {
                const p = JSON.parse(val);
                return { type: typeof p, value: p };
            } catch (e) {
                return { error: e.message };
            }
        };

        console.log('\n--- Parse Test ---');
        console.log('Images Parse:', parse(row.images));
        console.log('Location Parse:', parse(row.location));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

deepCheck();
