import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { query } from '@/lib/db';
import type { User } from '@/lib/types';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface AuthResult {
  user: User;
}

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: 'user' | 'admin';
  created_at: Date;
  updated_at: Date;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user profile
    const result = await query(
      `SELECT id, name, email, phone, role, created_at, updated_at 
       FROM users 
       WHERE id = $1::uuid`,
      [session.user.id]
    );

    if (result.rowCount === 0) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = result.rows[0];

    return new Response(JSON.stringify(user), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error fetching profile:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch profile' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { name } = await request.json();
    if (!name) {
      return new Response(JSON.stringify({ error: 'Name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update user profile
    const result = await query(
      `UPDATE users 
       SET name = $1::uuid, updated_at = NOW() 
       WHERE id = $2::uuid 
       RETURNING id::text, name, email, phone, role`,
      [name, session.user.id]
    );

    if (result.rowCount === 0) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = result.rows[0];

    return new Response(JSON.stringify({
      message: 'Profile updated successfully',
      user
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error updating profile:', error);
    return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 