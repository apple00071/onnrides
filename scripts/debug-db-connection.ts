import { Pool } from 'pg';
import { config } from 'dotenv';
import path from 'path';

// Load different environment files
console.log('=== Environment Debug ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Current working directory:', process.cwd());

// Try loading different env files
const envFiles = ['.env.local', '.env.production', '.env'];
for (const envFile of envFiles) {
  const envPath = path.join(process.cwd(), envFile);
  console.log(`\n--- Trying to load ${envFile} ---`);
  try {
    const result = config({ path: envPath });
    if (result.error) {
      console.log(`Error loading ${envFile}:`, result.error.message);
    } else {
      console.log(`Successfully loaded ${envFile}`);
    }
  } catch (error) {
    console.log(`Failed to load ${envFile}:`, error);
  }
}

// Check available database environment variables
console.log('\n=== Database Environment Variables ===');
const dbVars = [
  'DATABASE_URL',
  'POSTGRES_URL', 
  'onnrides_DATABASE_URL',
  'onnrides_POSTGRES_URL',
  'DATABASE_URL_UNPOOLED',
  'onnrides_DATABASE_URL_UNPOOLED'
];

for (const varName of dbVars) {
  const value = process.env[varName];
  if (value) {
    console.log(`${varName}: ${value.replace(/:[^:@]{1,}@/, ':****@')}`);
  } else {
    console.log(`${varName}: NOT SET`);
  }
}

// Test database connections
async function testDatabaseConnection(connectionString: string, name: string) {
  console.log(`\n=== Testing ${name} Connection ===`);
  if (!connectionString) {
    console.log(`❌ ${name}: No connection string provided`);
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 10000
  });

  try {
    const client = await pool.connect();
    
    // Test basic connection
    const timeResult = await client.query('SELECT NOW() as now');
    console.log(`✅ ${name}: Connection successful`);
    console.log(`   Database time: ${timeResult.rows[0].now}`);
    
    // Test data existence
    const tables = ['settings', 'users', 'vehicles', 'bookings', 'payments'];
    for (const table of tables) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   ${table}: ${countResult.rows[0].count} records`);
      } catch (error) {
        console.log(`   ${table}: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    client.release();
  } catch (error) {
    console.log(`❌ ${name}: Connection failed`);
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    await pool.end();
  }
}

async function main() {
  // Test different database URLs
  const connections = [
    { name: 'DATABASE_URL', url: process.env.DATABASE_URL },
    { name: 'POSTGRES_URL', url: process.env.POSTGRES_URL },
    { name: 'onnrides_DATABASE_URL', url: process.env.onnrides_DATABASE_URL },
    { name: 'onnrides_POSTGRES_URL', url: process.env.onnrides_POSTGRES_URL }
  ];

  for (const conn of connections) {
    if (conn.url) {
      await testDatabaseConnection(conn.url, conn.name);
    }
  }
}

main().catch(console.error);
