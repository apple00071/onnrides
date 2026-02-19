
const { Client } = require('pg');
require('dotenv').config();

async function checkAdmins() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const res = await client.query("SELECT name, email, phone, role FROM users WHERE role = 'admin'");
        console.table(res.rows);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

checkAdmins();
