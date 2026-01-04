
const { Pool } = require('pg');

async function createTable() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Creating activity_logs table...');

        await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        entity_id TEXT,
        user_id UUID REFERENCES users(id),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

        console.log('activity_logs table created successfully.');

    } catch (error) {
        console.error('Error creating table:', error);
    } finally {
        await pool.end();
    }
}

createTable();
