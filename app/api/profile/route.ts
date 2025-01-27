import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
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
    const auth = await getCurrentUser() as AuthResult | null;

    if (!auth) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user profile
    const user = await query(
      `SELECT id, name, email, phone, role, created_at, updated_at 
       FROM users 
       WHERE id = $1`,
      [auth.user.id]
    );

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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
    const auth = await getCurrentUser() as AuthResult | null;

    if (!auth) {
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
    const [user] = await db
      .update(users)
      .set({
        name,
        updated_at: new Date()
      })
      .where(eq(users.id, auth.user.id))
      .returning();

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
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