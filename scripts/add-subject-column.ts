import { Pool } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

async function addSubjectColumn() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgres://neondb_owner:fpBXEsTct9g1@ep-long-dream-a6avbuml-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require"
  });

  try {
    // Check if subject column exists
    const columnExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'email_logs' 
        AND column_name = 'subject'
      );
    `);

    if (!columnExists.rows[0].exists) {
      console.log('Adding subject column to email_logs table...');
      
      await pool.query(`
        ALTER TABLE email_logs 
        ADD COLUMN subject VARCHAR(255) NOT NULL DEFAULT 'No Subject';
      `);

      console.log('Subject column added successfully');
    } else {
      console.log('Subject column already exists');
    }

    // Verify the table structure
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'email_logs';
    `);

    console.log('Updated table structure:', columns.rows);

  } catch (error) {
    console.error('Failed to add subject column:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  addSubjectColumn()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export default addSubjectColumn; 