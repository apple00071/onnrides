const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('ssl=require') ? { rejectUnauthorized: false } : false
    });

    const client = await pool.connect();

    try {
        const sql = fs.readFileSync(
            path.join(__dirname, '../lib/migrations/012_add_offline_booking_fields.sql'),
            'utf8'
        );

        console.log('Running offline booking fields migration...');
        await client.query(sql);
        console.log('✅ Migration completed successfully!');

        client.release();
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        client.release();
        await pool.end();
        process.exit(1);
    }
}

runMigration();
