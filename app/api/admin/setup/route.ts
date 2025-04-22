import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

// POST /api/admin/setup - Create initial admin account and database schema
export async function POST(request: NextRequest) {
  try {
    // Drop existing tables to ensure clean setup
    await query('DROP TABLE IF EXISTS bookings CASCADE');
    await query('DROP TABLE IF EXISTS vehicles CASCADE');
    await query('DROP TABLE IF EXISTS users CASCADE');

    // Create users table with proper SERIAL primary key
    await query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        dob DATE,
        address TEXT,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        is_blocked BOOLEAN DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_verified BOOLEAN DEFAULT false,
        reset_token VARCHAR(255),
        reset_token_expiry TIMESTAMP
      )
    `);

    // Create vehicles table with proper SERIAL primary key
    await query(`
      CREATE TABLE vehicles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price_per_hour DECIMAL(10,2) NOT NULL,
        location VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        vehicle_type VARCHAR(50),
        registration_number VARCHAR(50),
        insurance_expiry DATE,
        last_serviced DATE,
        next_service_due DATE,
        total_bookings INTEGER DEFAULT 0,
        total_revenue DECIMAL(10,2) DEFAULT 0
      )
    `);

    // Create bookings table with proper SERIAL primary key
    await query(`
      CREATE TABLE bookings (
        id SERIAL PRIMARY KEY,
        booking_id VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id),
        vehicle_id INTEGER REFERENCES vehicles(id),
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        total_hours INTEGER NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        payment_method VARCHAR(50),
        payment_reference VARCHAR(255),
        notes TEXT,
        booking_type VARCHAR(50) NOT NULL DEFAULT 'online',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(20),
        customer_email VARCHAR(255),
        customer_address TEXT,
        dl_number VARCHAR(50),
        aadhaar_number VARCHAR(20),
        emergency_contact VARCHAR(20),
        security_deposit DECIMAL(10,2),
        documents JSONB
      )
    `);

    // Create admin user
    const adminEmail = 'admin@onnrides.com';
    const adminPassword = 'admin@123';

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // Insert admin user
    const result = await query(`
      INSERT INTO users (
        name,
        email,
        password_hash,
        role,
        is_blocked,
        is_verified
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, role
    `, [
      'Admin User',
      adminEmail,
      hashedPassword,
      'admin',
      false,
      true
    ]);

    const user = result.rows[0];
    logger.info('Admin user created:', user);
    
    return NextResponse.json({
      success: true,
      message: 'Database initialized and admin user created successfully',
      user,
      credentials: {
        email: adminEmail,
        password: adminPassword
      }
    });
  } catch (error) {
    logger.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Setup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 