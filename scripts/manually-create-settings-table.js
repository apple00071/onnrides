const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createSettingsTable() {
  const client = await pool.connect();
  try {
    console.log('Connected to database');
    
    // Create settings table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS "settings" (
        "id" TEXT PRIMARY KEY,
        "key" TEXT UNIQUE NOT NULL,
        "value" TEXT NOT NULL,
        "created_at" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP(6) NOT NULL DEFAULT NOW()
      )
    `);
    console.log('Settings table created or already exists');
    
    // Add index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS "idx_settings_key" ON "settings"("key")
    `);
    console.log('Index created or already exists');
    
    // Check if the maintenance_mode setting exists
    const { rows } = await client.query(
      'SELECT * FROM settings WHERE key = $1',
      ['maintenance_mode']
    );
    
    if (rows.length === 0) {
      // Insert default settings
      await client.query(`
        INSERT INTO "settings" ("id", "key", "value", "created_at", "updated_at")
        VALUES 
          ($1, $2, $3, NOW(), NOW())
      `, [
        require('crypto').randomUUID(),
        'maintenance_mode',
        'false'
      ]);
      console.log('Default maintenance_mode setting created');
    } else {
      console.log('maintenance_mode setting already exists:', rows[0]);
    }
    
    // List all settings
    const { rows: allSettings } = await client.query('SELECT * FROM settings');
    console.log('Current settings:', allSettings);
    
    console.log('Settings table setup complete!');
  } catch (error) {
    console.error('Error setting up settings table:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createSettingsTable().catch(console.error); 