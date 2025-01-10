import logger from '@/lib/logger';

import pool from '@/lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export 

export async function POST(request: Request) {
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

    // Get user from database
    

    

    if (!user) {
      logger.error('User not found:', email);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    
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

    // Get profile data
    

    
    if (!profile) {
      logger.error('No profile found for user:', user.id);
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Create session token
    

    // Create response with cookie
    

    // Set cookie in response
    response.cookies.set({
      name: 'admin_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/admin',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;
    
  } catch (error) {
    logger.error('Unexpected error:', error);
    
    response.cookies.delete('admin_session');
    return response;
  }
}

export async function GET(request: Request) {
  try {
    // Get session token from cookie header
    
    ')
      .find(c => c.trim().startsWith('admin_session='))
      ?.split('=')[1];
    
    if (!sessionToken) {
      
      response.cookies.delete('admin_session');
      return response;
    }

    // Verify token
    
      email: string;
      role: string;
    };

    // Get user profile
    

    
    if (!profile) {
      
      response.cookies.delete('admin_session');
      return response;
    }

    if (profile.role !== 'admin') {
      
      response.cookies.delete('admin_session');
      return response;
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
    
    response.cookies.delete('admin_session');
    return response;
  }
} 