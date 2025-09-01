import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { formatISO } from 'date-fns';

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
  vehicle_type: string;
}

interface ActivityLogResult {
  type: string;
  message: string;
  entity_id: string;
  timestamp: Date;
}

interface DashboardData {
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

    // Get total users
    const usersResult = await query(`
      SELECT COUNT(*) as total
      FROM users
      WHERE role = 'user'
    `);

    const totalUsers = parseInt(usersResult.rows[0].total);

    // Get total vehicles
    const vehiclesResult = await query(`
      SELECT COUNT(*) as total
      FROM vehicles
      WHERE status = 'active'
    `);

    const totalVehicles = parseInt(vehiclesResult.rows[0].total);

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

    // Format dates before sending to frontend
    const formattedBookings = recentBookingsResult.rows.map((booking: RawBookingResult) => ({
      id: booking.id,
      user_id: booking.user_id,
      vehicle_id: booking.vehicle_id,
      start_date: formatISO(booking.start_date),
      end_date: formatISO(booking.end_date),
      total_hours: booking.total_hours,
      total_price: booking.total_price,
      status: booking.status,
      payment_status: booking.payment_status,
      created_at: formatISO(booking.created_at),
      user_name: booking.user_name,
      user_email: booking.user_email,
      vehicle_name: booking.vehicle_name,
      vehicle_type: booking.vehicle_type,
      amount: booking.total_price.toString()
    }));

    // Get recent activity
    const recentActivityResult = await query(`
      SELECT 
        type,
        message,
        entity_id,
        created_at as timestamp
      FROM activity_logs
      ORDER BY created_at DESC
      LIMIT 5
    `);

    const formattedActivity = recentActivityResult.rows.map((activity: ActivityLogResult) => ({
      type: activity.type,
      message: activity.message,
      entity_id: activity.entity_id,
      timestamp: formatISO(activity.timestamp)
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalVehicles,
        totalBookings: parseInt(bookingStats.total),
        bookingGrowth: null, // Calculate this if needed
        recentBookings: formattedBookings,
        recentActivity: formattedActivity
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
