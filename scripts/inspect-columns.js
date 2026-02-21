const { Client } = require('pg');

const connectionString = "postgresql://postgres.kinpjjvnzyhksrxemzow:lmRWXL6zct0xiEIP@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";

async function inspectColumns() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        console.log('Inspecting column names for bookings table...');
        const result = await client.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'bookings' AND table_schema = 'public'"
        );

        for (const row of result.rows) {
            console.log(row.column_name);
        }

    } catch (error) {
        console.error('Error inspecting columns:', error);
    } finally {
        await client.end();
        process.exit(0);
    }
}

inspectColumns();
