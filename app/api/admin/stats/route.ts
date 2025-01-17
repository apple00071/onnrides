import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { users, vehicles, bookings } from '@/lib/schema';
import { sql } from 'drizzle-orm';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Initialize default values
    let vehiclesCount = 0;
    let usersCount = 0;
    let bookingsCount = 0;
    let revenue = 0;

    try {
      // Get total vehicles
      const [vehiclesResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(vehicles);
      vehiclesCount = vehiclesResult?.count || 0;

      // Get total users (excluding admin)
      const [usersResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(sql`${users.role} != 'admin'`);
      usersCount = usersResult?.count || 0;

      // Get total bookings
      const [bookingsResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(bookings);
      bookingsCount = bookingsResult?.count || 0;

      // Get total revenue
      const [revenueResult] = await db
        .select({
          total: sql<number>`COALESCE(sum(${bookings.total_price}), 0)`,
        })
        .from(bookings)
        .where(sql`${bookings.status} = 'completed'`);
      revenue = revenueResult?.total || 0;

      return NextResponse.json({
        totalVehicles: vehiclesCount,
        totalUsers: usersCount,
        totalBookings: bookingsCount,
        totalRevenue: revenue,
      });
    } catch (dbError) {
      logger.error('Database error while fetching stats:', dbError);
      // Return default values instead of throwing error
      return NextResponse.json({
        totalVehicles: vehiclesCount,
        totalUsers: usersCount,
        totalBookings: bookingsCount,
        totalRevenue: revenue,
      });
    }
  } catch (error) {
    logger.error('Failed to fetch admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
} 