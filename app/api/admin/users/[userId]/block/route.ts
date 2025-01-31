import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Block user by updating their status
    await query(
      `UPDATE users 
       SET status = 'blocked', 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [userId]
    );

    logger.info('User blocked successfully:', { userId });

    return NextResponse.json({
      message: 'User blocked successfully'
    });

  } catch (error) {
    logger.error('Error blocking user:', error);
    return NextResponse.json(
      { error: 'Failed to block user' },
      { status: 500 }
    );
  }
} 