const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkVehicles() {
    const client = await pool.connect();
    try {
        console.log('--- Sample Data (Deep Inspection) ---');
        const data = await client.query(`
      SELECT id, name, images, location, available_locations 
      FROM vehicles 
      WHERE name ILIKE '%Activa%'
      LIMIT 1;
    `);

        if (data.rows.length === 0) {
            console.log('No Activa found');
            return;
        }

        const row = data.rows[0];
        console.log('Name:', row.name);

        const inspect = (label, val) => {
            console.log(`\n[${label}]`);
            console.log('Type:', typeof val);
            console.log('Raw:', val);
            if (typeof val === 'string') {
                console.log('Hex first 10:', Buffer.from(val.substring(0, 10)).toString('hex'));
                try {
                    const p = JSON.parse(val);
                    console.log('Parsed once Type:', typeof p);
                    console.log('Parsed once Value:', p);
                    if (typeof p === 'string') {
                        const p2 = JSON.parse(p);
                        console.log('Parsed twice Value:', p2);
                    }
                } catch (e) {
                    console.log('JSON Parse failed:', e.message);
                }
            }
        };

        inspect('Images', row.images);
        inspect('Location', row.location);
        inspect('Available Locations', row.available_locations);

    } catch (error) {
        console.error('Error checking vehicles:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkVehicles();
