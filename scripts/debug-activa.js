const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function checkActiva() {
    try {
        await client.connect();
        const res = await client.query("SELECT id, name, images, location FROM vehicles WHERE name ILIKE '%Activa%' LIMIT 1");
        if (res.rows.length > 0) {
            const v = res.rows[0];
            console.log('--- RAW DATA (First 100 chars) ---');
            console.log('ID:', v.id);
            console.log('NAME:', v.name);
            console.log('IMAGES TYPE:', typeof v.images);
            console.log('IMAGES (Start):', String(v.images).substring(0, 100));
            console.log('IMAGES (End):', String(v.images).substring(String(v.images).length - 100));
            console.log('LOCATION TYPE:', typeof v.location);
            console.log('LOCATION (Start):', String(v.location).substring(0, 100));
            console.log('LOCATION (End):', String(v.location).substring(String(v.location).length - 100));
        } else {
            console.log('Activa not found');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkActiva();
