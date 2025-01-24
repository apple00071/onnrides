import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, vehicles, bookings, documents } from '@/lib/schema';
import { count, sql, eq, desc } from 'drizzle-orm';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface DashboardStats {
  total_users: number;
  total_revenue: number;
  total_vehicles: number;
  pending_documents: number;
  recent_bookings: Array<{
    id: string;
    amount: number;
    created_at: string;
    pickup_datetime: string;
    dropoff_datetime: string;
    status: string;
    user: {
      name: string | null;
      email: string;
    };
    vehicle: {
      name: string;
      type: string;
    };
  }>;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get total users
    const [usersResult] = await db
      .select({ value: count() })
      .from(users);

    // Get total revenue
    const [revenueResult] = await db
      .select({
        value: sql<string>`COALESCE(SUM(CAST(total_price AS DECIMAL)), 0)`
      })
      .from(bookings)
      .where(sql`status = 'completed'`);

    // Get total vehicles
    const [vehiclesResult] = await db
      .select({ value: count() })
      .from(vehicles);

    // Get pending documents count
    const [documentsResult] = await db
      .select({ value: count() })
      .from(documents)
      .where(sql`status = 'pending'`);

    // Get recent bookings
    const recentBookings = await db
      .select({
        id: bookings.id,
        amount: bookings.total_price,
        created_at: sql<string>`to_char(${bookings.created_at}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
        pickup_datetime: sql<string>`to_char(${bookings.start_date}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
        dropoff_datetime: sql<string>`to_char(${bookings.end_date}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
        status: bookings.status,
        user: {
          name: users.name,
          email: users.email
        },
        vehicle: {
          name: vehicles.name,
          type: vehicles.type
        }
      })
      .from(bookings)
      .innerJoin(users, eq(bookings.user_id, users.id))
      .innerJoin(vehicles, eq(bookings.vehicle_id, vehicles.id))
      .orderBy(desc(bookings.created_at))
      .limit(5);

    const stats: DashboardStats = {
      total_users: Number(usersResult.value),
      total_revenue: Number(revenueResult.value),
      total_vehicles: Number(vehiclesResult.value),
      pending_documents: Number(documentsResult.value),
      recent_bookings: recentBookings.map(booking => ({
        ...booking,
        amount: Number(booking.amount),
        created_at: booking.created_at,
        pickup_datetime: booking.pickup_datetime,
        dropoff_datetime: booking.dropoff_datetime
      }))
    };

    return NextResponse.json(stats);
  } catch (error) {
    logger.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
} 