import logger from '@/lib/logger';

import pool from '@/lib/db';
import bcrypt from 'bcryptjs';


export async function POST(request: NextRequest) {
  
  
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
    

    // Check if email exists
    

    if (emailCheck.rows.length > 0) {
      return NextResponse.json(
        { message: 'Email already exists' },
        { status: 400 }
      );
    }

    // Create user account
    

    

    // Split name into first_name and last_name
    const [firstName, ...lastNameParts] = name.trim().split(' ');
    

    // Create user profile
    await client.query(
      'INSERT INTO profiles (user_id, first_name, last_name, phone_number) VALUES ($1, $2, $3, $4)',
      [user.id, firstName, lastName || null, phone]
    );

    await client.query('COMMIT');

    // Generate token
    

    // Create response
    

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
    logger.error('Signup error:', error);
    
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 