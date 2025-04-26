import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Log attempt
    logger.info('Admin login attempt:', { email });

    // Validate required fields
    if (!email || !password) {
      logger.warn('Missing credentials:', { email });
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get user from database
    const result = await query(
      'SELECT id, email, role, password_hash FROM users WHERE email = $1 AND role = $2',
      [email, 'admin']
    );

    logger.debug('Database query result:', {
      found: result.rows.length > 0,
      role: result.rows[0]?.role
    });

    if (result.rows.length === 0) {
      logger.warn('User not found:', { email });
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    logger.debug('Password verification:', { 
      isValid: isValidPassword,
      hasPasswordHash: !!user.password_hash
    });

    if (!isValidPassword) {
      logger.warn('Invalid password for user:', { email });
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = await new SignJWT({ 
      id: user.id,
      email: user.email,
      role: user.role 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));

    // Update last login
    await query(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1::uuid',
      [user.id]
    );

    logger.info('Admin login successful:', { email });

    // Create response with cookie
    const response = NextResponse.json(
      { success: true },
      { status: 200 }
    );

    // Set cookie using headers
    response.headers.set(
      'Set-Cookie',
      `admin_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${24 * 60 * 60}`
    );

    return response;
  } catch (error) {
    logger.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 