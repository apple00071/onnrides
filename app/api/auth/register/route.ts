import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import logger from '@/lib/logger';

interface RegisterBody {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export async function POST(request: NextRequest) {
  let client;
  
  try {
    const body = await request.json() as RegisterBody;
    const { email, password, name, phone } = body;

    // Validate input
    if (!email || !password || !name || !phone) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Get database connection
    client = await pool.connect();

    try {
      // Check if email already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return NextResponse.json(
          { message: 'Email already registered' },
          { status: 409 }
        );
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Begin transaction
      await client.query('BEGIN');

      // Insert user
      const userResult = await client.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id',
        [email, hashedPassword, 'user']
      );

      // Create user profile
      await client.query(
        'INSERT INTO user_profiles (user_id, name, phone) VALUES ($1, $2, $3)',
        [userResult.rows[0].id, name, phone]
      );

      // Commit transaction
      await client.query('COMMIT');

      return NextResponse.json(
        { message: 'Registration successful' },
        { status: 201 }
      );
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Registration error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to register user',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        logger.error('Error releasing client:', releaseError);
      }
    }
  }
} 