const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres.kinpjjvnzyhksrxemzow:lmRWXL6zct0xiEIP@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('Adding customer_phone column to bookings table...');

        // Add customer_phone column for offline bookings
        await client.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20)`);

        console.log('✓ Added customer_phone column');

        // Also rename email to customer_email if it helps consistency, but for now let's stick to what we have
        // The previous migration added 'email' column to bookings, but we might want to refer to it as customer_email in code

        console.log('\nMigration completed successfully!');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
