import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { 
  User, 
  DocumentCounts, 
  BookingCounts,
  ApiResponse 
} from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
): Promise<NextResponse<ApiResponse<User & {
  documents: DocumentCounts;
  bookings: BookingCounts;
}>>> {
  try {
    // ... authentication check ...
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { userId } = params;

    // User query
    const userResult = await query<User>(
      'SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // ... document counts query ...
    const documentCountsResult = await query<DocumentCounts>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
      FROM documents
      WHERE user_id = $1
    `, [userId]);
    const documentCounts = documentCountsResult.rows[0];

    // ... booking counts query ...
    const bookingCountsResult = await query<BookingCounts>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM bookings
      WHERE user_id = $1
    `, [userId]);
    const bookingCounts = bookingCountsResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        documents: documentCounts,
        bookings: bookingCounts
      }
    });

  } catch (error) {
    logger.error('Error fetching user profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
} 