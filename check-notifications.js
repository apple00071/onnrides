
const { Client } = require('pg');
require('dotenv').config();

async function checkNotifications() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // Check if table exists
        const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'AdminNotification'
      );
    `);

        if (!tableCheck.rows[0].exists) {
            console.log('AdminNotification table does not exist');

            // Check whatsapp_logs as fallback
            const waLogsCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'whatsapp_logs'
        );
      `);

            if (waLogsCheck.rows[0].exists) {
                console.log('Checking whatsapp_logs instead...');
                const waLogs = await client.query('SELECT * FROM whatsapp_logs ORDER BY created_at DESC LIMIT 5');
                console.table(waLogs.rows);
            }
            return;
        }

        const result = await client.query('SELECT * FROM "AdminNotification" ORDER BY created_at DESC LIMIT 10');
        console.log('Recent Admin Notifications:');
        console.table(result.rows);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

checkNotifications();
