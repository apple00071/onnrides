import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let client;
  
  try {
    const body = await request.json();
    const { email, password, name, phone } = body;

    // Validate input
    if (!email || !password || !name || !phone) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Get database connection
    try {
      client = await pool.connect();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { success: false, message: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    await client.query('BEGIN');

    try {
      // Check if email exists
      const emailCheck = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (emailCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, message: 'Email already exists' },
          { status: 400 }
        );
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

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
        id: user.id.toString(),
        email: user.email,
        role: user.role
      });

      // Create response
      const response = NextResponse.json(
        { 
          success: true, 
          message: 'Account created successfully',
          user: {
            id: user.id,
            email: user.email,
            name: name,
            phone: phone
          }
        },
        { status: 201 }
      );

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
      console.error('Registration error:', error);
      
      // Determine if it's a database constraint violation
      if (error.code === '23505') { // unique_violation
        return NextResponse.json(
          { success: false, message: 'Email already registered' },
          { status: 400 }
        );
      }
      
      throw error; // Re-throw to be caught by outer catch
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to create account',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('Error releasing client:', releaseError);
      }
    }
  }
} 