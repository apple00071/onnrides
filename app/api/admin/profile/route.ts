import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { query } from '@/lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    logger.debug('Attempting login for:', email);

    // Get user from database using raw SQL
    const { rows: [user] } = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (!user) {
      logger.error('User not found:', email);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      logger.error('Invalid password for user:', email);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is an admin
    if (user.role !== 'admin') {
      logger.error('User is not an admin:', email);
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    // Create session token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });

    // Set cookie using response headers
    response.headers.set(
      'Set-Cookie',
      `admin_session=${token}; Path=/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24}`
    );

    return response;
  } catch (error) {
    logger.error('Unexpected error:', error);
    const response = NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
    
    // Clear cookie using response headers
    response.headers.set(
      'Set-Cookie',
      'admin_session=; Path=/admin; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    );
    
    return response;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get session token from request headers
    const authHeader = request.headers.get('Cookie');
    const sessionToken = authHeader?.split(';')
      .find(c => c.trim().startsWith('admin_session='))
      ?.split('=')[1];

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { 
          status: 401,
          headers: {
            'Set-Cookie': 'admin_session=; Path=/admin; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
          }
        }
      );
    }

    // Verify token
    const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      role: string;
    };

    // Get user profile
    const { rows: [profile] } = await query(
      'SELECT id, email, role FROM users WHERE id = $1::uuid',
      [decoded.userId]
    );

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { 
          status: 404,
          headers: {
            'Set-Cookie': 'admin_session=; Path=/admin; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
          }
        }
      );
    }

    if (profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { 
          status: 403,
          headers: {
            'Set-Cookie': 'admin_session=; Path=/admin; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
          }
        }
      );
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        email: profile.email,
        role: profile.role
      }
    });
  } catch (error) {
    logger.error('Session verification error:', error);
    return NextResponse.json(
      { error: 'Invalid or expired session' },
      { 
        status: 401,
        headers: {
          'Set-Cookie': 'admin_session=; Path=/admin; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
        }
      }
    );
  }
} 