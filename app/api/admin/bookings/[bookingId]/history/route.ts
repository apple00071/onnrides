import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface BookingHistoryEntry {
  id: string;
  booking_id: string;
  action: string;
  details: string;
  created_at: Date;
  created_by: string;
  user?: {
    name: string | null;
  } | null;
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

    // Fetch booking history using Prisma
    const history = await prisma.BookingHistory.findMany({
      where: {
        booking_id: params.bookingId
      },
      include: {
        user: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Format the history entries
    const formattedHistory = history.map((entry: BookingHistoryEntry) => ({
      id: entry.id,
      booking_id: entry.booking_id,
      action: entry.action,
      details: entry.details,
      created_at: entry.created_at,
      created_by: entry.user?.name || entry.created_by
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