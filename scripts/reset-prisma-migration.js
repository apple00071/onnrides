// Script to reset Prisma migration state after direct database fixes
require('dotenv').config();
const { Client } = require('pg');
const { execSync } = require('child_process');
const path = require('path');

async function resetPrismaMigration() {
  console.log('===== RESETTING PRISMA MIGRATION STATE =====');
  
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

    // 1. Check if _prisma_migrations table exists
    console.log('Checking for _prisma_migrations table...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_prisma_migrations'
      ) as exists;
    `);
    
    const migrationTableExists = tableCheck.rows[0].exists;
    
    if (migrationTableExists) {
      console.log('_prisma_migrations table exists, removing records for the problematic migration...');
      
      // Delete any record of the problematic migration
      await client.query(`
        DELETE FROM _prisma_migrations 
        WHERE migration_name = '20250425_fix_all_uuid_types_comprehensive'
        OR migration_name = '20250424081736_fix_all_uuid_types_comprehensive'
      `);
      
      console.log('Problematic migration records removed.');
      
      // List remaining migrations
      const migrationsResult = await client.query(`
        SELECT migration_name, started_at, finished_at
        FROM _prisma_migrations
        ORDER BY started_at DESC
      `);
      
      console.log('\nCurrent migrations in database:');
      migrationsResult.rows.forEach(migration => {
        const status = migration.finished_at ? 'completed' : 'pending';
        console.log(`- ${migration.migration_name} (${status})`);
      });
    } else {
      console.log('No _prisma_migrations table found, nothing to reset.');
    }
    
    // 2. Generate Prisma client to match the current database state
    console.log('\nRegenerating Prisma client...');
    try {
      execSync('npx prisma generate', { stdio: 'inherit' });
      console.log('✅ Prisma client regenerated successfully');
    } catch (genError) {
      console.error('❌ Error regenerating Prisma client:', genError.message);
    }
    
    console.log('\nPrisma migration state reset completed');
  } catch (error) {
    console.error('Reset failed:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the script
resetPrismaMigration().catch(console.error); 