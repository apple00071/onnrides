const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    const tables = ['email_logs', 'whatsapp_logs'];
    for (const table of tables) {
        const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [table]);
        console.log(`\nTable: ${table}`);
        res.rows.forEach(r => console.log(`- ${r.column_name}`));
    }

    await client.end();
}

check().catch(console.error);
