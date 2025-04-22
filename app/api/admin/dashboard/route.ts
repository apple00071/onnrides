import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { QueryResult } from 'pg';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

interface TestRow {
  test: number;
}

interface BookingRow {
  id: string;
  amount: string | null;
  status: string;
  start_date: string;
  end_date: string;
  user_name: string | null;
  user_email: string | null;
  vehicle_name: string | null;
}

interface UserRow {
  total: string;
}

interface VehicleRow {
  total: string;
}

interface BookingStatsRow {
  total_bookings: string;
  total_revenue: string;
}

interface ActivityRow {
  type: string;
  message: string;
  timestamp: string;
  entity_id: string;
}

// Default response data structure
const defaultData = {
  totalUsers: 0,
  totalRevenue: 0,
  totalBookings: 0,
  totalVehicles: 0,
  bookingGrowth: 0,
  revenueGrowth: 0,
  recentBookings: [],
  recentActivity: []
};

export async function GET(request: NextRequest) {
  try {
    logger.debug('[Dashboard API] Request received');

    // Get and validate session first to fail fast
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized access',
          data: defaultData
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Test database connection
    const testResult = await query('SELECT 1 as test');
    if (!testResult.rows[0]) {
      throw new Error('Database connection test failed');
    }

    // Get total users
    const usersResult = await query(`
      SELECT COUNT(*)::text as total 
      FROM users 
      WHERE role = 'user'
    `);
    const totalUsers = parseInt(usersResult.rows[0]?.total || '0');

    // Get total vehicles
    const vehiclesResult = await query(`
      SELECT COUNT(*)::text as total 
      FROM vehicles 
      WHERE is_available = true
    `);
    const totalVehicles = parseInt(vehiclesResult.rows[0]?.total || '0');

    // Get booking stats
    const bookingStatsResult = await query(`
      SELECT 
        COUNT(*)::text as total_bookings,
        COALESCE(SUM(total_price)::text, '0') as total_revenue
      FROM bookings 
      WHERE status != 'cancelled'
    `);
    const totalBookings = parseInt(bookingStatsResult.rows[0]?.total_bookings || '0');
    const totalRevenue = parseFloat(bookingStatsResult.rows[0]?.total_revenue || '0');

    // Calculate growth (previous vs current month)
    const currentMonthResult = await query(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_price), 0) as revenue
      FROM bookings
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
      AND status != 'cancelled'
    `);

    const previousMonthResult = await query(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_price), 0) as revenue
      FROM bookings
      WHERE created_at >= date_trunc('month', CURRENT_DATE - interval '1 month')
      AND created_at < date_trunc('month', CURRENT_DATE)
      AND status != 'cancelled'
    `);

    const currentMonthBookings = parseInt(currentMonthResult.rows[0]?.count || '0');
    const previousMonthBookings = parseInt(previousMonthResult.rows[0]?.count || '0');
    const currentMonthRevenue = parseFloat(currentMonthResult.rows[0]?.revenue || '0');
    const previousMonthRevenue = parseFloat(previousMonthResult.rows[0]?.revenue || '0');

    // Get recent activity
    const recentActivityResult = await query(`
      WITH booking_activity AS (
        SELECT 
          'booking' as type,
          CASE 
            WHEN b.status = 'confirmed' THEN 'Booking confirmed'
            WHEN b.status = 'pending' THEN 'New booking created'
            ELSE 'Booking ' || b.status
          END as message,
          b.created_at as activity_time,
          b.id::text as entity_id
        FROM bookings b
        ORDER BY b.created_at DESC
        LIMIT 3
      ),
      vehicle_activity AS (
        SELECT 
          'vehicle' as type,
          'New vehicle added: ' || v.name as message,
          v.created_at as activity_time,
          v.id::text as entity_id
        FROM vehicles v
        ORDER BY v.created_at DESC
        LIMIT 2
      ),
      user_activity AS (
        SELECT 
          'user' as type,
          'New user registered: ' || u.name as message,
          u.created_at as activity_time,
          u.id::text as entity_id
        FROM users u
        WHERE u.role = 'user'
        ORDER BY u.created_at DESC
        LIMIT 2
      )
      SELECT 
        type, 
        message, 
        to_char(activity_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as timestamp,
        entity_id
      FROM (
        SELECT * FROM booking_activity
        UNION ALL
        SELECT * FROM vehicle_activity
        UNION ALL
        SELECT * FROM user_activity
      ) all_activity
      ORDER BY activity_time DESC
      LIMIT 5
    `);

    // Get recent bookings
    const recentBookingsResult = await query(`
      SELECT 
        b.id,
        CAST(b.total_price AS text) as amount,
        b.status,
        to_char(b.start_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as start_date,
        to_char(b.end_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as end_date,
        u.name as user_name,
        u.email as user_email,
        v.name as vehicle_name
      FROM bookings b
      LEFT JOIN users u ON b.user_id::text = u.id::text
      LEFT JOIN vehicles v ON b.vehicle_id::text = v.id::text
      ORDER BY b.created_at DESC
      LIMIT 5
    `);

    // Calculate growth percentages
    const calculateGrowth = (current: number, previous: number): number | null => {
      if (previous === 0) return null;
      return ((current - previous) / previous) * 100;
    };

    const bookingGrowth = calculateGrowth(currentMonthBookings, previousMonthBookings);
    const revenueGrowth = calculateGrowth(currentMonthRevenue, previousMonthRevenue);

    const dashboardData = {
      totalUsers,
      totalVehicles,
      totalBookings,
      totalRevenue,
      bookingGrowth,
      revenueGrowth,
      recentActivity: recentActivityResult.rows,
      recentBookings: recentBookingsResult.rows
    };

    // Create and return the response
    return new Response(
      JSON.stringify({
        success: true,
        data: dashboardData
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    logger.error('[Dashboard API] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        data: defaultData
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
} 