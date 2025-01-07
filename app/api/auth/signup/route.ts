import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const { email, password, name, phone } = await request.json();

    // Validate input
    if (!email || !password || !name || !phone) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Check if email exists
    const emailCheck = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (emailCheck.rows.length > 0) {
      return NextResponse.json(
        { message: 'Email already exists' },
        { status: 400 }
      );
    }

    // Create user account
    const userResult = await client.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email, password_hash, 'user']
    );

    const user = userResult.rows[0];

    // Split name into first_name and last_name
    const [firstName, ...lastNameParts] = name.trim().split(' ');
    const lastName = lastNameParts.join(' ');

    // Create user profile
    await client.query(
      'INSERT INTO profiles (user_id, first_name, last_name, phone_number) VALUES ($1, $2, $3, $4)',
      [user.id, firstName, lastName || null, phone]
    );

    await client.query('COMMIT');

    // Generate token
    const token = await generateToken({ 
      id: user.id, 
      email: user.email,
      role: user.role 
    });

    // Create response
    const response = NextResponse.json({ 
      success: true,
      message: 'Account created successfully'
    });

    // Set cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    return response;
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Signup error:', error);
    
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 