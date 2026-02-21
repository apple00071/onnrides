const { Client } = require('pg');

const connectionString = "postgresql://postgres.kinpjjvnzyhksrxemzow:lmRWXL6zct0xiEIP@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";

async function inspectBookings() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        console.log('Fetching last 10 bookings...');
        const result = await client.query(
            "SELECT id, booking_id, status, created_at FROM bookings ORDER BY created_at DESC LIMIT 10"
        );

        for (const row of result.rows) {
            console.log(JSON.stringify(row));
        }

    } catch (error) {
        console.error('Error inspecting bookings:', error);
    } finally {
        await client.end();
        process.exit(0);
    }
}

inspectBookings();
