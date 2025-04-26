// Script to verify database structure and column types
require('dotenv').config();
const { Client } = require('pg');

async function verifyDatabaseStructure() {
  console.log('===== Database Structure and UUID Verification =====');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!\n');

    // Check UUID extensions
    console.log('Checking UUID extensions:');
    const extensionsResult = await client.query(`
      SELECT name, default_version, installed_version
      FROM pg_available_extensions 
      WHERE name IN ('uuid-ossp', 'pgcrypto')
    `);
    
    if (extensionsResult.rows.length > 0) {
      extensionsResult.rows.forEach(ext => {
        console.log(`- ${ext.name}: ${ext.installed_version || 'not installed'} (default: ${ext.default_version})`);
      });
    } else {
      console.log('No UUID extensions found');
    }

    // Check tables 
    console.log('\nChecking tables:');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`Found ${tablesResult.rows.length} tables:`);
    tablesResult.rows.forEach(table => {
      console.log(`- ${table.table_name}`);
    });

    // Check column types for key tables
    console.log('\nChecking column types for key tables:');
    
    const targetTables = ['users', 'bookings', 'documents', 'vehicles'];
    
    for (const table of targetTables) {
      const columnsResult = await client.query(`
        SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      if (columnsResult.rows.length > 0) {
        console.log(`\n${table} table columns:`);
        columnsResult.rows.forEach(col => {
          const defaultVal = col.column_default ? ` (default: ${col.column_default})` : '';
          const nullable = col.is_nullable === 'YES' ? ' NULL' : ' NOT NULL';
          console.log(`- ${col.column_name}: ${col.data_type}${nullable}${defaultVal}`);
        });
      } else {
        console.log(`Table ${table} not found or has no columns`);
      }
    }

    // Check foreign key relationships
    console.log('\nChecking foreign key relationships:');
    const fkResult = await client.query(`
      SELECT
        tc.constraint_name,
        tc.table_name, kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
      ORDER BY tc.table_name, ccu.table_name
    `);
    
    if (fkResult.rows.length > 0) {
      fkResult.rows.forEach(fk => {
        console.log(`- ${fk.constraint_name}: ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } else {
      console.log('No foreign key relationships found');
    }

    // Specifically check UUID column types
    console.log('\nVerifying UUID column types:');
    const uuidColumns = [
      { table: 'users', column: 'id' },
      { table: 'bookings', column: 'id' },
      { table: 'bookings', column: 'user_id' },
      { table: 'bookings', column: 'vehicle_id' },
      { table: 'documents', column: 'id' },
      { table: 'documents', column: 'user_id' },
      { table: 'vehicles', column: 'id' }
    ];
    
    for (const col of uuidColumns) {
      const typeResult = await client.query(`
        SELECT data_type
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `, [col.table, col.column]);
      
      if (typeResult.rows.length > 0) {
        const dataType = typeResult.rows[0].data_type;
        const isUuid = dataType === 'uuid';
        console.log(`- ${col.table}.${col.column}: ${dataType} ${isUuid ? '✅' : '❌'}`);
      } else {
        console.log(`- ${col.table}.${col.column}: Column not found ❌`);
      }
    }

    console.log('\nVerification complete!');
  } catch (error) {
    console.error('Error verifying database structure:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the function
verifyDatabaseStructure().catch(console.error); 