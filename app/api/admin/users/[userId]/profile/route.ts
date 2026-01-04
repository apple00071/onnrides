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
    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { userId } = params;

    // Fetch user details and aggregations using a single query
    const userResult = await query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.phone, 
        u.role::text, 
        u.created_at,
        (SELECT COUNT(*) FROM documents WHERE user_id = u.id) as doc_count,
        (SELECT COUNT(*) FROM bookings WHERE user_id = u.id) as total_bookings,
        (SELECT COUNT(*) FROM bookings WHERE user_id = u.id AND status = 'completed') as completed_bookings,
        (SELECT COUNT(*) FROM bookings WHERE user_id = u.id AND status = 'cancelled') as cancelled_bookings
      FROM users u
      WHERE u.id = $1
    `, [userId]);

    const user = userResult.rows[0];

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at,
        documents: {
          total: parseInt(user.doc_count)
        },
        bookings: {
          total: parseInt(user.total_bookings),
          completed: parseInt(user.completed_bookings),
          cancelled: parseInt(user.cancelled_bookings)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}