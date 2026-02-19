
const { Client } = require('pg');
require('dotenv').config();

async function listTables() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('ALL TABLES IN PUBLIC SCHEMA:');
        res.rows.forEach(r => console.log('- ' + r.table_name));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

listTables();
