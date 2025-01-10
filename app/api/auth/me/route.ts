import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user data from database with profile
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          u.id,
          u.email,
          u.role,
          CASE 
            WHEN u.role = 'admin' THEN ap.*
            ELSE up.*
          END as profile,
          CASE 
            WHEN COUNT(DISTINCT ds.document_type) = 4 AND COUNT(*) = COUNT(CASE WHEN ds.status = 'approved' THEN 1 END)
            THEN true
            ELSE false
          END as is_documents_verified
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id AND u.role = 'user'
        LEFT JOIN admin_profiles ap ON u.id = ap.user_id AND u.role = 'admin'
        LEFT JOIN document_submissions ds ON u.id = ds.user_id
        WHERE u.email = $1
        GROUP BY u.id, u.email, u.role, up.*, ap.*`,
        [session.user.email]
      );

      const user = result.rows[0];

      if (!user) {
        return NextResponse.json(
          { message: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          profile: user.profile,
          isDocumentsVerified: user.is_documents_verified
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Auth check error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to check authentication',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
} 