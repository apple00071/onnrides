import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bookings, vehicles } from '@/lib/schema';
import { eq, desc, and } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth';
import logger from '@/lib/logger';

export async function GET() {
  try {
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's recent bookings
    const recentBookings = await db
      .select({
        id: bookings.id,
        vehicle_name: vehicles.name,
        start_date: bookings.start_date,
        end_date: bookings.end_date,
        total_price: bookings.total_price,
        status: bookings.status,
        payment_status: bookings.payment_status,
        created_at: bookings.created_at
      })
      .from(bookings)
      .innerJoin(vehicles, eq(bookings.vehicle_id, vehicles.id))
      .where(eq(bookings.user_id, user.id))
      .orderBy(desc(bookings.created_at))
      .limit(5);

    // Get total bookings count
    const [bookingsCount] = await db
      .select({ count: bookings.id })
      .from(bookings)
      .where(eq(bookings.user_id, user.id));

    // Get total amount spent
    const [totalSpent] = await db
      .select({ total: bookings.total_price })
      .from(bookings)
      .where(
        and(
          eq(bookings.user_id, user.id),
          eq(bookings.status, 'completed')
        )
      );

    return NextResponse.json({
      recent_bookings: recentBookings,
      total_bookings: Number(bookingsCount?.count || 0),
      total_spent: Number(totalSpent?.total || 0)
    });
  } catch (error) {
    logger.error('Error fetching user dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
} 