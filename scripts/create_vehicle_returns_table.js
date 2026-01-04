
const { Pool } = require('pg');

async function createTable() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Creating vehicle_returns table...');

        await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicle_returns (
        id UUID PRIMARY KEY,
        booking_id TEXT NOT NULL REFERENCES bookings(id),
        condition_notes TEXT,
        damages JSONB,
        additional_charges NUMERIC,
        odometer_reading NUMERIC,
        fuel_level NUMERIC,
        status TEXT,
        processed_by UUID REFERENCES users(id),
        security_deposit_deductions NUMERIC,
        security_deposit_refund_amount NUMERIC,
        security_deposit_refund_method TEXT,
        deduction_reasons TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

        console.log('vehicle_returns table created successfully.');

    } catch (error) {
        console.error('Error creating table:', error);
    } finally {
        await pool.end();
    }
}

createTable();
