import { config } from 'dotenv';
import pool from '@/lib/db';

// Load environment variables
config();

async function createTables() {
  const client = await pool.connect();
  try {
    console.log('Creating tables...');
    console.log('Database URL:', process.env.POSTGRES_URL_NON_POOLING ? 'Found' : 'Not found');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table created successfully');

    // Create profiles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        phone_number VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Profiles table created successfully');

    // Create vehicles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        brand VARCHAR(100) NOT NULL,
        model VARCHAR(100) NOT NULL,
        year INTEGER NOT NULL,
        color VARCHAR(50),
        transmission VARCHAR(50),
        fuel_type VARCHAR(50),
        mileage NUMERIC,
        seating_capacity INTEGER,
        price_per_day NUMERIC NOT NULL,
        is_available BOOLEAN DEFAULT true,
        image_url TEXT,
        location VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Vehicles table created successfully');

    // Create bookings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
        pickup_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
        dropoff_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
        pickup_location VARCHAR(255),
        drop_location VARCHAR(255),
        total_amount NUMERIC NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        payment_status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Bookings table created successfully');

    // Create document_submissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_submissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        document_type VARCHAR(50) NOT NULL,
        document_url TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        admin_comments TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Document submissions table created successfully');

    // Create payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        amount NUMERIC NOT NULL,
        payment_method VARCHAR(50),
        transaction_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Payments table created successfully');

    // Create reviews table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Reviews table created successfully');

    console.log('All tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

createTables()
  .catch((err) => {
    console.error('Failed to create tables:', err);
    process.exit(1);
  }); 