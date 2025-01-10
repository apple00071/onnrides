import logger from '@/lib/logger';
;

import pool from '@/lib/db';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    // This should be properly secured in production
    const { email, password } = await request.json();

    // Check if user already exists
    

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    
    

    // Create user with admin role
    

    

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
    logger.error('Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 