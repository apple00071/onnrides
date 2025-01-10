import logger from '@/lib/logger';

import pool from '@/lib/db';
import bcrypt from 'bcryptjs';


export 

export async function POST(request: NextRequest) {
  let client;
  
  try {
    
    const { email, password, name, phone } = body;

    // Validate input
    if (!email || !password || !name || !phone) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    
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
      logger.error('Database connection error:', dbError);
      return NextResponse.json(
        { success: false, message: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    await client.query('BEGIN');

    try {
      // Check if email exists
      

      if (emailCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, message: 'Email already exists' },
          { status: 400 }
        );
      }

      // Hash password
      

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
      logger.error('Registration error:', error);
      
      // Determine if it&apos;s a database constraint violation
      if (error.code === '23505') { // unique_violation
        return NextResponse.json(
          { success: false, message: 'Email already registered' },
          { status: 400 }
        );
      }
      
      throw error; // Re-throw to be caught by outer catch
    }
  } catch (error: any) {
    logger.error('Registration error:', error);
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
        logger.error('Error releasing client:', releaseError);
      }
    }
  }
} 