const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres.kinpjjvnzyhksrxemzow:lmRWXL6zct0xiEIP@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('Starting database migration...');

        // Add missing columns to bookings table
        const migrations = [
            // Add booking_id column if it doesn't exist
            `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_id VARCHAR(50)`,

            // Add paid_amount column if it doesn't exist
            `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10, 2) DEFAULT 0`,

            // Add booking_type column if it doesn't exist
            `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type VARCHAR(20) DEFAULT 'online'`,

            // Add customer_name for offline bookings
            `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255)`,

            // Add email for offline bookings
            `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,

            // Add registration_number for vehicle tracking
            `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS registration_number VARCHAR(50)`,

            // Add pickup_location
            `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_location VARCHAR(255)`,

            // Update existing bookings to have a booking_id if they don't have one
            `UPDATE bookings SET booking_id = id::text WHERE booking_id IS NULL`,

            // Add status column to vehicles if not exists
            `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`,

            // Add is_available column to vehicles if not exists
            `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true`,
        ];

        for (const sql of migrations) {
            try {
                await client.query(sql);
                console.log('✓', sql.substring(0, 60) + '...');
            } catch (err) {
                // Ignore errors for columns that already exist
                if (err.code !== '42701') { // 42701 = column already exists
                    console.error('Error:', err.message);
                }
            }
        }

        console.log('\nMigration completed successfully!');

        // Show current table structure
        const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'bookings'
      ORDER BY ordinal_position
    `);

        console.log('\nBookings table columns:');
        columns.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
        });

    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
