import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    // This should be properly secured in production
    const { email, password } = await request.json();

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user with admin role
    const userResult = await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
      [email, passwordHash, 'admin']
    );

    const userId = userResult.rows[0].id;

    // Create profile with admin role
    await pool.query(
      'INSERT INTO profiles (user_id, role) VALUES ($1, $2)',
      [userId, 'admin']
    );

    return NextResponse.json({ 
      message: 'Admin user created successfully',
      userId: userId
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 