import logger from '@/lib/logger';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    logger.debug('Checking admin access for email:', email);

    if (!email) {
      logger.debug('Email is required but was not provided');
      return new NextResponse(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Find the user and check their role using PostgreSQL query
    const result = await query(`
      SELECT 
        id,
        email,
        role::text as role
      FROM users 
      WHERE LOWER(email) = LOWER($1)
    `, [email]);

    const user = result.rows[0];

    logger.debug('Found user:', user);

    if (!user) {
      logger.debug('User not found for email:', email);
      return new NextResponse(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isAdmin = user.role?.toLowerCase() === 'admin';
    logger.debug('User role check', { role: user.role, isAdmin });

    return new NextResponse(JSON.stringify({
      isAdmin,
      role: user.role,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Check admin error:', error);
    if (error instanceof Error) {
      logger.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return new NextResponse(JSON.stringify({
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}