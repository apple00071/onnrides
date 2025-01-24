import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import logger from '@/lib/logger';
import { User } from '@/lib/types';

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
    const bookingsResult = await sql`
      SELECT 
        COUNT(*)::int as total_bookings,
        COALESCE(SUM(total_price), 0)::float as total_revenue
      FROM bookings
    `;
    reports.total_bookings = bookingsResult.rows[0].total_bookings;
    reports.total_revenue = bookingsResult.rows[0].total_revenue;

    // Get total users
    const usersResult = await sql`
      SELECT COUNT(*)::int as total_users FROM users
    `;
    reports.total_users = usersResult.rows[0].total_users;

    // Get total vehicles
    const vehiclesResult = await sql`
      SELECT COUNT(*)::int as total_vehicles FROM vehicles
    `;
    reports.total_vehicles = vehiclesResult.rows[0].total_vehicles;

    // Get pending documents
    const documentsResult = await sql`
      SELECT COUNT(*)::int as pending_docs 
      FROM documents 
      WHERE status = 'pending'
    `;
    reports.pending_documents = documentsResult.rows[0].pending_docs;

    // Get monthly revenue
    const monthlyRevenueResult = await sql`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COALESCE(SUM(total_price), 0)::float as revenue
      FROM bookings
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC
    `;
    reports.monthly_revenue = monthlyRevenueResult.rows.map(row => ({
      month: row.month,
      revenue: row.revenue
    }));

    // Get vehicle type distribution
    const distributionResult = await sql`
      SELECT 
        type::text,
        COUNT(*)::int as count
      FROM vehicles
      GROUP BY type
      ORDER BY count DESC
    `;
    reports.vehicle_distribution = distributionResult.rows.map(row => ({
      type: row.type,
      count: row.count
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