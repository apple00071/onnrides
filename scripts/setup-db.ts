import { config } from 'dotenv';
import { resolve } from 'path';
import * as bcrypt from 'bcryptjs';

// Load environment variables from .env file
config({ path: resolve(__dirname, '../.env') });

import { db } from '../lib/db';
import logger from '../lib/logger';
import { sql } from 'drizzle-orm';

async function setupDatabase() {
  try {
    // Drop existing tables in correct order
    await db.execute(sql`DROP TABLE IF EXISTS documents CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS bookings CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS vehicles CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS profiles CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS users CASCADE;`);

    // Enable UUID extension
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Create users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create profiles table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255),
        phone VARCHAR(50),
        avatar_url TEXT,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        zip_code VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create vehicles table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS vehicles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        brand VARCHAR(100) NOT NULL,
        model VARCHAR(100) NOT NULL,
        year INTEGER NOT NULL,
        color VARCHAR(50) NOT NULL,
        license_plate VARCHAR(50) UNIQUE NOT NULL,
        seats INTEGER NOT NULL,
        transmission VARCHAR(50) NOT NULL,
        fuel_type VARCHAR(50) NOT NULL,
        price_per_day DECIMAL(10,2) NOT NULL,
        location JSONB NOT NULL,
        images JSONB NOT NULL,
        is_available BOOLEAN DEFAULT true,
        owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create bookings table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
        start_date TIMESTAMP WITH TIME ZONE NOT NULL,
        end_date TIMESTAMP WITH TIME ZONE NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        payment_intent_id VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create documents table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        url TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create an admin user
    const adminEmail = 'admin@onnrides.com';
    const adminPassword = 'admin123';
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

    await db.execute(sql`
      INSERT INTO users (email, password_hash, role, name)
      VALUES (${adminEmail}, ${adminPasswordHash}, 'admin', 'Admin User')
      ON CONFLICT (email) DO NOTHING;
    `);

    // Verify admin user was created
    const result = await db.execute(sql`
      SELECT * FROM users WHERE email = ${adminEmail};
    `);
    logger.info('Admin user verification:', result);

    // Test password verification
    if (result.rows[0]) {
      const storedHash = result.rows[0].password_hash as string;
      const isValid = await bcrypt.compare(adminPassword, storedHash);
      logger.info('Password verification test:', isValid);
    }

    logger.info('Database setup completed successfully');
  } catch (error) {
    logger.error('Error setting up database:', error);
    throw error;
  }
}

setupDatabase(); 