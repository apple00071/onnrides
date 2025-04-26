// Script to apply UUID fixes directly to the database
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyUuidFix() {
  console.log('===== APPLYING UUID FIXES DIRECTLY =====');
  
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

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../prisma/migrations/20250425_fix_all_uuid_types_comprehensive/migration.sql');
    console.log(`Reading migration file: ${migrationPath}`);
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('Migration SQL loaded successfully');
    
    // Execute the SQL directly
    console.log('\nExecuting migration...');
    
    // Split the SQL into separate statements to execute them one by one
    // and provide better error reporting if something fails
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';
      
      try {
        console.log(`\nExecuting statement ${i+1}/${statements.length}:`);
        console.log(`${stmt.substring(0, 100)}${stmt.length > 100 ? '...' : ''}`);
        
        await client.query(stmt);
        console.log('✅ Statement executed successfully');
      } catch (stmtError) {
        console.error(`❌ Error executing statement: ${stmtError.message}`);
        console.error('Full statement:', stmt);
        
        // Continue with the next statement instead of aborting
        console.log('Continuing with next statement...');
      }
    }
    
    console.log('\nFinished applying migration');
    
    // Now verify the structure to make sure it worked
    console.log('\nVerifying database structure:');
    const columnsResult = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('users', 'bookings', 'documents', 'vehicles')
        AND (column_name = 'id' OR column_name LIKE '%_id')
      ORDER BY table_name, column_name
    `);
    
    console.log('\nColumn types after migration:');
    columnsResult.rows.forEach(col => {
      const isUuid = col.data_type === 'uuid';
      console.log(`- ${col.table_name}.${col.column_name}: ${col.data_type} ${isUuid ? '✅' : '❌'}`);
    });
    
    console.log('\nMigration completed');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the script
applyUuidFix().catch(console.error); 