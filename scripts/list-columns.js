const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function listColumns() {
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'vehicles'");
        console.log('Columns in vehicles table:');
        console.log(res.rows.map(r => r.column_name).join(', '));
    } catch (error) {
        console.error('Error listing columns:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

listColumns();
