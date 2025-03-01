import { NextRequest } from 'next/server';
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

// Default response data structure
const defaultData = {
  totalUsers: 0,
  totalRevenue: 0,
  totalBookings: 0,
  totalVehicles: 0,
  bookingGrowth: 0,
  revenueGrowth: 0,
  recentBookings: []
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
    const dbTest = await query<TestRow>('SELECT 1 as test');
    if (!dbTest?.rows?.[0]?.test) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database connection failed',
          data: defaultData
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Fetch all stats in parallel
    const [userStats, vehicleStats, bookingStats, lastMonthStats, recentBookings] = await Promise.all([
      query<UserRow>('SELECT COUNT(id) as total FROM users WHERE role != $1', ['admin']),
      query<VehicleRow>('SELECT COUNT(id) as total FROM vehicles WHERE status = $1', ['active']),
      query<BookingStatsRow>(`
        SELECT COUNT(id) as total_bookings, COALESCE(SUM(NULLIF(total_price, 0)), 0) as total_revenue
        FROM bookings WHERE status = 'confirmed' AND created_at >= date_trunc('month', CURRENT_DATE)
      `),
      query<BookingStatsRow>(`
        SELECT COUNT(id) as total_bookings, COALESCE(SUM(NULLIF(total_price, 0)), 0) as total_revenue
        FROM bookings WHERE status = 'confirmed'
        AND created_at >= date_trunc('month', CURRENT_DATE - interval '1' month)
        AND created_at < date_trunc('month', CURRENT_DATE)
      `),
      query<BookingRow>(`
        SELECT b.id, b.total_price as amount, b.status, b.start_date, b.end_date,
               u.name as user_name, u.email as user_email, v.name as vehicle_name
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN vehicles v ON b.vehicle_id = v.id
        WHERE b.status != 'cancelled'
        ORDER BY b.created_at DESC LIMIT 5
      `)
    ]);

    // Calculate growth percentages
    const calculateGrowth = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const dashboardData = {
      totalUsers: parseInt(userStats.rows[0]?.total || '0'),
      totalRevenue: parseFloat(bookingStats.rows[0]?.total_revenue || '0'),
      totalBookings: parseInt(bookingStats.rows[0]?.total_bookings || '0'),
      totalVehicles: parseInt(vehicleStats.rows[0]?.total || '0'),
      bookingGrowth: calculateGrowth(
        parseInt(bookingStats.rows[0]?.total_bookings || '0'),
        parseInt(lastMonthStats.rows[0]?.total_bookings || '0')
      ),
      revenueGrowth: calculateGrowth(
        parseFloat(bookingStats.rows[0]?.total_revenue || '0'),
        parseFloat(lastMonthStats.rows[0]?.total_revenue || '0')
      ),
      recentBookings: recentBookings.rows.map((booking: BookingRow) => ({
        id: booking.id,
        amount: parseFloat(booking.amount || '0'),
        status: booking.status,
        startDate: booking.start_date,
        endDate: booking.end_date,
        user: {
          name: booking.user_name || 'Unknown',
          email: booking.user_email || 'N/A'
        },
        vehicle: {
          name: booking.vehicle_name || 'Unknown'
        }
      }))
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