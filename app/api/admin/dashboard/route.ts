import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

interface BookingWithRelations {
  id: string;
  user_id: string;
  vehicle_id: string;
  start_date: Date;
  end_date: Date;
  total_hours: number;
  total_price: number;
  status: string;
  payment_status: string;
  created_at: Date;
  user: {
    name: string;
    email: string;
  };
  vehicle: {
    name: string;
    model: string;
    brand: string;
  };
}

interface RawBookingResult {
  id: string;
  user_id: string;
  vehicle_id: string;
  start_date: Date;
  end_date: Date;
  total_hours: number;
  total_price: number;
  status: string;
  payment_status: string;
  created_at: Date;
  user_name: string;
  user_email: string;
  vehicle_name: string;
  vehicle_model: string;
  vehicle_brand: string;
}

interface RevenueData {
  date: Date;
  revenue: number;
}

interface DashboardData {
  totalRevenue: number;
  totalBookings: number;
  recentBookings: RawBookingResult[];
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

    // Get booking stats
    const bookingStatsResult = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
      FROM bookings
      WHERE status IN ('active', 'completed', 'cancelled')
    `);

    const bookingStats = bookingStatsResult.rows[0];

    // Get recent bookings
    const recentBookingsResult = await query(`
      SELECT 
        b.id,
        b.user_id,
        b.vehicle_id,
        b.start_date,
        b.end_date,
        b.total_hours,
        b.total_price,
        b.status,
        b.payment_status,
        b.created_at,
        u.name as user_name,
        u.email as user_email,
        v.name as vehicle_name,
        v.type as vehicle_type
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN vehicles v ON b.vehicle_id = v.id
      ORDER BY b.created_at DESC
      LIMIT 5
    `);

    // Get revenue data
    const revenueDataResult = await query(`
      SELECT 
        DATE(created_at) as date,
        SUM(total_price) as revenue
      FROM bookings
      WHERE status = 'completed'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
      LIMIT 30
    `);

    const formattedRevenueData = revenueDataResult.rows.map((data: { date: Date; revenue: string }) => ({
      date: data.date,
      revenue: parseFloat(data.revenue) || 0
    }));

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          total: parseInt(bookingStats.total),
          active: parseInt(bookingStats.active),
          completed: parseInt(bookingStats.completed),
          cancelled: parseInt(bookingStats.cancelled)
        },
        recentBookings: recentBookingsResult.rows,
        revenueData: formattedRevenueData
      }
    });

  } catch (error) {
    logger.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': '*',
    },
  });
} 
