import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const currentUser = await getCurrentUser(request.cookies);
    if (!currentUser || currentUser.role !== 'admin') {
      console.log('Unauthorized migration attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      // Start transaction
      await client.query('BEGIN');

      console.log('Starting migration...');

      // Create update_updated_at_column function if it doesn't exist
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql'
      `);
      console.log('Created update_updated_at_column function');

      // Drop existing tables if they exist
      await client.query(`
        DROP TABLE IF EXISTS bookings CASCADE;
        DROP TABLE IF EXISTS vehicles CASCADE;
      `);
      console.log('Dropped existing tables');

      // Create vehicles table
      await client.query(`
        CREATE TABLE vehicles (
          id SERIAL PRIMARY KEY,
          owner_id INTEGER NOT NULL REFERENCES users(id),
          name VARCHAR(100) NOT NULL,
          type VARCHAR(20) NOT NULL,
          location VARCHAR(100) NOT NULL,
          price_per_day DECIMAL(10,2) NOT NULL,
          is_available BOOLEAN DEFAULT true,
          image_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Created vehicles table');

      // Create indexes for vehicles table
      await client.query(`
        CREATE INDEX idx_vehicles_owner_id ON vehicles(owner_id);
        CREATE INDEX idx_vehicles_location ON vehicles(location);
        CREATE INDEX idx_vehicles_type ON vehicles(type);
        CREATE INDEX idx_vehicles_is_available ON vehicles(is_available)
      `);
      console.log('Created indexes for vehicles table');

      // Create trigger for updating timestamp on vehicles table
      await client.query(`
        CREATE TRIGGER update_vehicles_updated_at
        BEFORE UPDATE ON vehicles
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
      `);
      console.log('Created trigger for vehicles table');

      // Create bookings table
      await client.query(`
        CREATE TABLE bookings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
          start_date TIMESTAMP WITH TIME ZONE NOT NULL,
          end_date TIMESTAMP WITH TIME ZONE NOT NULL,
          pickup_location TEXT,
          drop_location TEXT,
          amount DECIMAL(10,2) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
          payment_id VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Created bookings table');

      // Create indexes for bookings table
      await client.query(`
        CREATE INDEX idx_bookings_user_id ON bookings(user_id);
        CREATE INDEX idx_bookings_vehicle_id ON bookings(vehicle_id);
        CREATE INDEX idx_bookings_status ON bookings(status)
      `);
      console.log('Created indexes for bookings table');

      // Create trigger for updating timestamp on bookings table
      await client.query(`
        CREATE TRIGGER update_bookings_updated_at
        BEFORE UPDATE ON bookings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
      `);
      console.log('Created trigger for bookings table');

      // Commit transaction
      await client.query('COMMIT');

      console.log('Migration completed successfully');
      return NextResponse.json({ 
        message: 'Migration successful',
        details: 'Created bookings table with all required columns and indexes'
      });
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      console.error('Migration error:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error during migration:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 