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
    const bookingsStats = await query(`
      SELECT 
        COUNT(*) as total_bookings,
        COALESCE(SUM(total_price), 0) as total_revenue
      FROM bookings
    `);

    reports.total_bookings = parseInt(bookingsStats.rows[0].total_bookings);
    reports.total_revenue = parseFloat(bookingsStats.rows[0].total_revenue);

    // Get total users
    const usersStats = await query('SELECT COUNT(*) as total FROM users');
    reports.total_users = parseInt(usersStats.rows[0].total);

    // Get total vehicles
    const vehiclesStats = await query('SELECT COUNT(*) as total FROM vehicles');
    reports.total_vehicles = parseInt(vehiclesStats.rows[0].total);

    // Get pending documents
    const documentsStats = await query("SELECT COUNT(*) as total FROM documents WHERE status = 'pending'");
    reports.pending_documents = parseInt(documentsStats.rows[0].total);

    // Get monthly revenue
    const monthlyRevenueResult = await query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COALESCE(SUM(total_price), 0) as revenue
      FROM bookings
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC
    `);

    reports.monthly_revenue = monthlyRevenueResult.rows.map((row: any) => ({
      month: row.month,
      revenue: parseFloat(row.revenue)
    }));

    // Get vehicle type distribution
    const distributionResult = await query(`
      SELECT 
        type,
        COUNT(*) as count
      FROM vehicles
      GROUP BY type
      ORDER BY count DESC
    `);

    reports.vehicle_distribution = distributionResult.rows.map((row: any) => ({
      type: row.type,
      count: parseInt(row.count)
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