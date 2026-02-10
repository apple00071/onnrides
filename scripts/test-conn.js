const { Pool } = require('pg');
require('dotenv').config();

async function testConnection() {
    console.log('Testing connection to:', process.env.DATABASE_URL);
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const res = await pool.query("SELECT email, role, phone FROM users WHERE role = 'admin' LIMIT 5");
        console.log('Admins found:', JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Connection failed:', err.message);
        if (err.code) console.error('Error code:', err.code);
    } finally {
        await pool.end();
    }
}

testConnection();
