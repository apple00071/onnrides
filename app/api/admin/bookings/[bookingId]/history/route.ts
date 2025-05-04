import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface BookingHistoryEntry {
  id: string;
  bookingId: string;
  action: string;
  details: string;
  createdAt: Date;
  createdBy: string;
  userName?: string | null;
}

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

    // Fetch booking history using direct SQL
    const historyResult = await query(`
      SELECT 
        bh.id, 
        bh."bookingId", 
        bh.action, 
        bh.details, 
        bh."createdAt", 
        bh."createdBy",
        u.name as "userName"
      FROM "bookingHistory" bh
      LEFT JOIN users u ON bh."userId" = u.id
      WHERE bh."bookingId" = $1
      ORDER BY bh."createdAt" DESC
    `, [params.bookingId]);

    // Format the history entries
    const formattedHistory = historyResult.rows.map((entry: BookingHistoryEntry) => ({
      id: entry.id,
      bookingId: entry.bookingId,
      action: entry.action,
      details: entry.details,
      createdAt: entry.createdAt,
      createdBy: entry.userName || entry.createdBy
    }));

    return NextResponse.json({
      success: true,
      history: formattedHistory
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