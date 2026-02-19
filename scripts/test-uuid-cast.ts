
import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function testUuidCast() {
    console.log('Testing UUID cast...');
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to DB');

        // Attempt to cast a non-UUID string to UUID
        // This replicates the query in verify route: WHERE id = $1::uuid with booking_id='ORLBW'
        await client.query('SELECT * FROM bookings WHERE id = $1::uuid', ['ORLBW']);

    } catch (error: any) {
        console.log('CAUGHT ERROR:');
        console.log('Message:', error.message);
        console.log('Code:', error.code);
        console.log('Full Error:', JSON.stringify(error, null, 2));
    } finally {
        await client.end();
    }
}

testUuidCast();
