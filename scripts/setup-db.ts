import { neon } from '@neondatabase/serverless';
import logger from '@/lib/logger';

async function main() {
  try {
    logger.info('Starting database setup...');
    
    const sql = neon(process.env.DATABASE_URL!);

    // Drop existing tables
    await sql`DROP TABLE IF EXISTS documents CASCADE;`;
    await sql`DROP TABLE IF EXISTS bookings CASCADE;`;
    await sql`DROP TABLE IF EXISTS vehicles CASCADE;`;
    await sql`DROP TABLE IF EXISTS users CASCADE;`;

    // Create extensions
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;

    // Create users table
    await sql`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        status user_status NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create vehicles table
    await sql`
      CREATE TABLE vehicles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        price_per_hour DECIMAL(10,2) NOT NULL,
        min_booking_hours INTEGER NOT NULL DEFAULT 12,
        location JSONB NOT NULL,
        images JSONB NOT NULL,
        is_available BOOLEAN NOT NULL DEFAULT true,
        status vehicle_status NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create bookings table
    await sql`
      CREATE TABLE bookings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        vehicle_id UUID NOT NULL REFERENCES vehicles(id),
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        total_hours DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        status booking_status NOT NULL DEFAULT 'pending',
        payment_status payment_status NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create documents table
    await sql`
      CREATE TABLE documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        file_url TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        rejection_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    logger.info('Database setup completed successfully');
  } catch (error) {
    logger.error('Database setup failed:', error);
    process.exit(1);
  }
}

main().catch(console.error); 