import { Pool } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

async function createEmailLogsTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgres://neondb_owner:fpBXEsTct9g1@ep-long-dream-a6avbuml-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require"
  });

  try {
    // First check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'email_logs'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('Creating email_logs table...');
      
      // Create the table
      await pool.query(`
        CREATE TABLE email_logs (
          id SERIAL PRIMARY KEY,
          recipient VARCHAR(255) NOT NULL,
          subject VARCHAR(255) NOT NULL,
          message_content TEXT,
          booking_id UUID,
          status VARCHAR(50) NOT NULL,
          error TEXT,
          message_id VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Add index on booking_id for faster lookups
        CREATE INDEX idx_email_logs_booking_id ON email_logs(booking_id);

        -- Add index on created_at for faster sorting and date-based queries
        CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);
      `);

      console.log('email_logs table created successfully');
    } else {
      console.log('email_logs table already exists');
    }

    // Verify the table structure
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'email_logs';
    `);

    console.log('Table structure:', columns.rows);

  } catch (error) {
    console.error('Failed to create email_logs table:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  createEmailLogsTable()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export default createEmailLogsTable; 