import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch booking history
    const history = await query(
      `SELECT 
        bh.id,
        bh.booking_id,
        bh.action,
        bh.details,
        bh.created_at,
        COALESCE(u.name, bh.created_by) as created_by
      FROM booking_history bh
      LEFT JOIN users u ON bh.created_by = u.id
      WHERE bh.booking_id = $1::uuid
      ORDER BY bh.created_at DESC`,
      [params.bookingId]
    );

    return NextResponse.json({
      success: true,
      history: history.rows
    });
  } catch (error) {
    logger.error('Error fetching booking history:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch booking history'
      },
      { status: 500 }
    );
  }
} 