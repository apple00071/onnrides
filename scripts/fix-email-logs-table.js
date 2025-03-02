// Script to fix email_logs table schema issues
require('dotenv').config();
const { Pool } = require('pg');

// Create a database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined
});

async function fixEmailLogsTable() {
  console.log('Starting email_logs table fix script...');
  
  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'email_logs'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      console.log('email_logs table does not exist. Creating it...');
      await pool.query(`
        CREATE TABLE email_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          recipient TEXT NOT NULL,
          subject TEXT NOT NULL,
          status TEXT NOT NULL,
          booking_id TEXT,
          message_content TEXT,
          error TEXT,
          message_id TEXT,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_email_logs_status ON email_logs(status);
        CREATE INDEX idx_email_logs_recipient ON email_logs(recipient);
        CREATE INDEX idx_email_logs_booking_id ON email_logs(booking_id);
        CREATE INDEX idx_email_logs_created_at ON email_logs(created_at);
      `);
      console.log('email_logs table created successfully');
      return;
    }
    
    // Table exists, check columns
    console.log('email_logs table exists. Checking columns...');
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'email_logs';
    `);
    
    const existingColumns = columnsResult.rows.map(row => row.column_name);
    console.log('Existing columns:', existingColumns);
    
    // Define expected columns
    const expectedColumns = [
      'id', 'recipient', 'subject', 'status', 'booking_id',
      'message_content', 'error', 'message_id', 'created_at', 'updated_at'
    ];
    
    // Find missing columns
    const missingColumns = expectedColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('Missing columns found:', missingColumns);
      
      // Add each missing column
      for (const column of missingColumns) {
        try {
          let dataType = 'TEXT';
          let defaultValue = '';
          
          if (column === 'created_at' || column === 'updated_at') {
            dataType = 'TIMESTAMPTZ';
            defaultValue = 'DEFAULT CURRENT_TIMESTAMP';
          }
          
          console.log(`Adding column ${column} to email_logs table...`);
          await pool.query(`
            ALTER TABLE email_logs
            ADD COLUMN IF NOT EXISTS ${column} ${dataType} ${defaultValue};
          `);
          
          console.log(`Column ${column} added successfully`);
        } catch (error) {
          console.error(`Error adding column ${column}:`, error.message);
        }
      }
      
      console.log('Column additions completed');
    } else {
      console.log('All expected columns exist in the table');
    }
    
    // Ensure indexes exist
    console.log('Creating missing indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status)',
      'CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient)',
      'CREATE INDEX IF NOT EXISTS idx_email_logs_booking_id ON email_logs(booking_id)',
      'CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at)'
    ];
    
    for (const indexQuery of indexes) {
      await pool.query(indexQuery);
    }
    
    console.log('Index creation completed');
    console.log('email_logs table fix completed successfully');
    
  } catch (error) {
    console.error('Error fixing email_logs table:', error);
  } finally {
    await pool.end();
  }
}

// Run the function
fixEmailLogsTable()
  .then(() => {
    console.log('Script execution completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 