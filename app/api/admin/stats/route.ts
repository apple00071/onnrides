import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, vehicles, bookings } from '@/lib/schema';
import { count, sql } from 'drizzle-orm';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get total users
    const [userStats] = await db
      .select({ value: count() })
      .from(users);
    const totalUsers = userStats?.value || 0;

    // Get total vehicles
    const [vehicleStats] = await db
      .select({ value: count() })
      .from(vehicles);
    const totalVehicles = vehicleStats?.value || 0;

    // Get total bookings and revenue
    const [bookingStats] = await db
      .select({
        count: count(),
        revenue: sql<string>`COALESCE(SUM(CAST(total_price AS DECIMAL)), 0)`
      })
      .from(bookings)
      .where(sql`status = 'completed'`);
    
    const totalBookings = bookingStats?.count || 0;
    const totalRevenue = parseFloat(bookingStats?.revenue || '0');

    return NextResponse.json({
      totalUsers,
      totalVehicles,
      totalBookings,
      totalRevenue
    });
  } catch (error) {
    logger.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
} 