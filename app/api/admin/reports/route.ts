import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { User } from '@/lib/types';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface Reports {
  total_bookings: number;
  total_revenue: number;
  total_users: number;
  total_vehicles: number;
  pending_documents: number;
  monthly_revenue: { month: string; revenue: number }[];
  vehicle_distribution: { type: string; count: number }[];
}

interface BookingStats {
  total_bookings: number;
  total_revenue: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

interface VehicleDistribution {
  type: string;
  count: number;
}

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    const user = session?.user as User | undefined;

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reports: Reports = {
      total_bookings: 0,
      total_revenue: 0,
      total_users: 0,
      total_vehicles: 0,
      pending_documents: 0,
      monthly_revenue: [],
      vehicle_distribution: []
    };

    // Get total bookings and revenue
    const [bookingsStats] = await query
      .select({
        total_bookings: count(),
        total_revenue: sql<number>`COALESCE(SUM(CAST(${bookings.total_price} AS DECIMAL)), 0)`
      })
      .from(bookings);
    
    reports.total_bookings = Number(bookingsStats.total_bookings);
    reports.total_revenue = bookingsStats.total_revenue;

    // Get total users
    const [usersStats] = await query
      .select({ total: count() })
      .from(users);
    reports.total_users = Number(usersStats.total);

    // Get total vehicles
    const [vehiclesStats] = await query
      .select({ total: count() })
      .from(vehicles);
    reports.total_vehicles = Number(vehiclesStats.total);

    // Get pending documents
    const [documentsStats] = await query
      .select({ total: count() })
      .from(documents)
      .where(eq(documents.status, 'pending'));
    reports.pending_documents = Number(documentsStats.total);

    // Get monthly revenue
    const monthlyRevenue = await query
      .select({
        month: sql<string>`TO_CHAR(${bookings.created_at}, 'YYYY-MM')`,
        revenue: sql<number>`COALESCE(SUM(CAST(${bookings.total_price} AS DECIMAL)), 0)`
      })
      .from(bookings)
      .where(sql`${bookings.created_at} >= NOW() - INTERVAL '12 months'`)
      .groupBy(sql`TO_CHAR(${bookings.created_at}, 'YYYY-MM')`)
      .orderBy(sql`month DESC`);

    reports.monthly_revenue = monthlyRevenue.map(row => ({
      month: row.month,
      revenue: row.revenue
    }));

    // Get vehicle type distribution
    const distribution = await query
      .select({
        type: vehicles.type,
        count: count()
      })
      .from(vehicles)
      .groupBy(vehicles.type)
      .orderBy(sql`count DESC`);

    reports.vehicle_distribution = distribution.map(row => ({
      type: row.type,
      count: Number(row.count)
    }));

    return NextResponse.json(reports);
  } catch (error) {
    logger.error('Error generating reports:', error);
    return NextResponse.json(
      { error: 'Failed to generate reports' },
      { status: 500 }
    );
  }
} 