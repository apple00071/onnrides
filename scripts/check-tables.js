const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();

// Create a new pool using the connection string
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL_NON_POOLING,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkTables() {
  const client = await pool.connect();
  try {
    console.log('Checking database tables...\n');

    // Get all tables
    const tables = await client.query(`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public'
    `);

    for (const table of tables.rows) {
      const tableName = table.tablename;
      console.log(`\n📋 Checking table: ${tableName}`);

      // Get columns for each table
      const columns = await client.query(`
        SELECT 
          column_name, 
          data_type, 
          character_maximum_length,
          column_default,
          is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      // Get foreign keys
      const foreignKeys = await client.query(`
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = $1
      `, [tableName]);

      // Print column details
      columns.rows.forEach(column => {
        const fk = foreignKeys.rows.find(fk => fk.column_name === column.column_name);
        const nullable = column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = column.column_default ? `DEFAULT ${column.column_default}` : '';
        const fkInfo = fk ? ` -> References ${fk.foreign_table_name}(${fk.foreign_column_name})` : '';
        
        console.log(`  ├─ ${column.column_name}: ${column.data_type}${
          column.character_maximum_length ? `(${column.character_maximum_length})` : ''
        } ${nullable} ${defaultVal}${fkInfo}`);
      });

      // Get indexes
      const indexes = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = $1
      `, [tableName]);

      if (indexes.rows.length > 0) {
        console.log('\n  Indexes:');
        indexes.rows.forEach(index => {
          console.log(`  └─ ${index.indexname}`);
        });
      }
    }

    console.log('\n✅ Database schema check completed successfully!');
  } catch (error) {
    console.error('Error checking tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

checkTables()
  .catch((err) => {
    console.error('Failed to check tables:', err);
    process.exit(1);
  }); 