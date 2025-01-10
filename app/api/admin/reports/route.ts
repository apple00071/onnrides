import logger from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface User {
  id: string;
  role: string;
}

interface Reports {
  total_bookings: number;
  total_revenue: number;
  total_users: number;
  total_vehicles: number;
  pending_documents: number;
  monthly_revenue: { month: string; revenue: number }[];
  vehicle_distribution: { type: string; count: number }[];
}

interface MonthlyRevenueRow {
  month: string;
  revenue: string;
}

interface VehicleDistributionRow {
  type: string;
  count: string;
}

export async function GET(request: NextRequest) {
  let client;
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    const user = session?.user as User | undefined;

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get database connection
    client = await pool.connect();
    
    try {
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
      const bookingsResult = await client.query(`
        SELECT COUNT(*) as total_bookings, SUM(total_amount) as total_revenue 
        FROM bookings
      `);
      reports.total_bookings = parseInt(bookingsResult.rows[0].total_bookings);
      reports.total_revenue = parseFloat(bookingsResult.rows[0].total_revenue) || 0;

      // Get total users
      const usersResult = await client.query('SELECT COUNT(*) as total_users FROM users');
      reports.total_users = parseInt(usersResult.rows[0].total_users);

      // Get total vehicles
      const vehiclesResult = await client.query('SELECT COUNT(*) as total_vehicles FROM vehicles');
      reports.total_vehicles = parseInt(vehiclesResult.rows[0].total_vehicles);

      // Get pending documents
      const documentsResult = await client.query(`
        SELECT COUNT(*) as pending_docs 
        FROM documents 
        WHERE status = 'pending'
      `);
      reports.pending_documents = parseInt(documentsResult.rows[0].pending_docs);

      // Get monthly revenue
      const monthlyRevenueResult = await client.query(`
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') as month,
          SUM(total_amount) as revenue
        FROM bookings
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY month
        ORDER BY month DESC
      `);
      reports.monthly_revenue = monthlyRevenueResult.rows.map((row: MonthlyRevenueRow) => ({
        month: row.month,
        revenue: parseFloat(row.revenue) || 0
      }));

      // Get vehicle type distribution
      const distributionResult = await client.query(`
        SELECT type, COUNT(*) as count
        FROM vehicles
        GROUP BY type
      `);
      reports.vehicle_distribution = distributionResult.rows.map((row: VehicleDistributionRow) => ({
        type: row.type,
        count: parseInt(row.count)
      }));

      return NextResponse.json(reports);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error generating reports:', error);
    return NextResponse.json(
      { error: 'Failed to generate reports' },
      { status: 500 }
    );
  }
} 