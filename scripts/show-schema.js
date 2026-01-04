const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres.kinpjjvnzyhksrxemzow:lmRWXL6zct0xiEIP@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

async function showSchema() {
    try {
        // Get all tables
        const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

        console.log('='.repeat(60));
        console.log('DATABASE SCHEMA - ALL TABLES AND COLUMNS');
        console.log('='.repeat(60));
        console.log(`\nFound ${tables.rows.length} tables:\n`);

        for (const t of tables.rows) {
            console.log(`\n📋 ${t.table_name.toUpperCase()}`);
            console.log('-'.repeat(40));

            const cols = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [t.table_name]);

            cols.rows.forEach(c => {
                const nullable = c.is_nullable === 'YES' ? '?' : '';
                console.log(`   ${c.column_name}${nullable}: ${c.data_type}`);
            });
        }

        console.log('\n' + '='.repeat(60));

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

showSchema();
