import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { userId } = params;

    // Get user profile
    const userResult = await query(
      'SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get document counts
    const documentCountsResult = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
      FROM documents
      WHERE user_id = $1
    `, [userId]);
    const documentCounts = documentCountsResult.rows[0];

    // Get booking counts
    const bookingCountsResult = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM bookings
      WHERE user_id = $1
    `, [userId]);
    const bookingCounts = bookingCountsResult.rows[0];

    return NextResponse.json({
      ...user,
      documents: documentCounts,
      bookings: bookingCounts
    });

  } catch (error) {
    logger.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
} 