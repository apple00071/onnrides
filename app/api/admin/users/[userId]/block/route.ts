import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { userId } = params;
    const { blocked } = await request.json();

    // Update user's blocked status
    const result = await query(
      `UPDATE users 
       SET is_blocked = $1, 
           updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, name, email, role, phone, is_blocked, created_at`,
      [blocked, userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const updatedUser = result.rows[0];
    logger.info(`User ${blocked ? 'blocked' : 'unblocked'}:`, {
      userId,
      adminId: session.user.id
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    logger.error('Error updating user block status:', error);
    return NextResponse.json(
      { error: 'Failed to update user status' },
      { status: 500 }
    );
  }
} 