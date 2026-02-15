import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's recent bookings
    const recentBookings = await query(`
      SELECT 
        b.id,
        v.name as vehicle_name,
        b.start_date,
        b.end_date,
        b.total_price,
        b.status,
        b.payment_status,
        b.created_at
      FROM bookings b
      INNER JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.user_id = $1::uuid
      ORDER BY b.created_at DESC
      LIMIT 5
    `, [session.user.id]);

    // Get total bookings count
    const bookingsCount = await query(`
      SELECT COUNT(id) as count
      FROM bookings
      WHERE user_id = $1::uuid
    `, [session.user.id]);

    // Get total amount spent
    const totalSpent = await query(`
      SELECT SUM(total_price) as total
      FROM bookings
      WHERE user_id = $1::uuid
    `, [session.user.id]);

    return NextResponse.json({
      recent_bookings: recentBookings.rows,
      total_bookings: Number(bookingsCount.rows[0]?.count || 0),
      total_spent: Number(totalSpent.rows[0]?.total || 0)
    });
  } catch (error) {
    logger.error('Error fetching user dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
} 