import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyAuth } from '@/lib/auth';
import { users, bookings, vehicles, documents } from '@/lib/schema';
import { count, sum } from 'drizzle-orm';
import { eq, ne, desc } from 'drizzle-orm';

interface DashboardStats {
  total_users: number;
  total_revenue: number;
  total_vehicles: number;
  pending_documents: number;
  recent_bookings: Array<{
    id: string;
    user_name: string | null;
    user_email: string;
    vehicle_name: string;
    amount: number;
    status: string;
    created_at: Date;
    pickup_datetime: Date;
    dropoff_datetime: Date;
    pickup_location: string;
    drop_location: string;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const user = await verifyAuth(cookieStore);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get total users (excluding admins)
    const [usersResult] = await db
      .select({ value: count() })
      .from(users)
      .where(ne(users.role, 'admin'));
    
    // Get total revenue from completed bookings
    const [revenueResult] = await db
      .select({
        value: sum(bookings.total_price)
      })
      .from(bookings)
      .where(eq(bookings.status, 'completed'));
    
    // Get total vehicles
    const [vehiclesResult] = await db
      .select({ value: count() })
      .from(vehicles);
    
    // Get pending documents
    const [documentsResult] = await db
      .select({ value: count() })
      .from(documents)
      .where(eq(documents.status, 'pending'));
    
    // Get recent bookings
    const recentBookings = await db
      .select({
        id: bookings.id,
        user_name: users.name,
        user_email: users.email,
        vehicle_name: vehicles.name,
        amount: bookings.total_price,
        status: bookings.status,
        created_at: bookings.created_at,
        pickup_datetime: bookings.start_date,
        dropoff_datetime: bookings.end_date,
        pickup_location: vehicles.location,
        drop_location: vehicles.location,
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