import { config } from 'dotenv';
config(); // Load environment variables from .env file

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import logger from '../lib/logger';

async function fixBookingIds() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const migrationFile = path.join(process.cwd(), 'migrations', 'fix_booking_ids.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    logger.info('Running booking ID fix migration...');

    // Execute the migration
    await pool.query(sql);

    // Verify the results
    const result = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(booking_id) as with_booking_id,
             COUNT(DISTINCT booking_id) as unique_booking_ids
      FROM bookings
    `);

    const stats = result.rows[0];
    logger.info('Migration completed successfully', {
      totalBookings: stats.total,
      bookingsWithId: stats.with_booking_id,
      uniqueBookingIds: stats.unique_booking_ids
    });

  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixBookingIds(); 