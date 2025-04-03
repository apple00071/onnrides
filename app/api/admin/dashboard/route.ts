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

// Add an interface for recent activity data
interface ActivityRow {
  type: string;
  message: string;
  timestamp: string;
  entity_id: string | null;
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

    // Initialize with default values
    let userStatsResult: any = { rows: [{ total: '0' }] };
    let vehicleStatsResult: any = { rows: [{ total: '0' }] };
    let bookingStatsResult: any = { rows: [{ total_bookings: '0', total_revenue: '0' }] };
    let lastMonthStatsResult: any = { rows: [{ total_bookings: '0', total_revenue: '0' }] };
    let recentBookingsResult: any = { rows: [] };
    let recentActivityResult: any = { rows: [] };

    // Test database connection
    try {
      const dbTest = await query('SELECT 1 as test');
      if (!dbTest?.rows?.[0]?.test) {
        throw new Error('Database connection failed');
      }
    } catch (error) {
      logger.error('Database connection test failed:', error);
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

    // Fetch all stats in parallel with individual error handling
    try {
      userStatsResult = await query('SELECT COUNT(id) as total FROM users WHERE role != $1', ['admin']);
    } catch (error) {
      logger.error('Error fetching user stats:', error);
    }

    try {
      vehicleStatsResult = await query('SELECT COUNT(id) as total FROM vehicles WHERE status = $1', ['active']);
    } catch (error) {
      logger.error('Error fetching vehicle stats:', error);
    }

    try {
      bookingStatsResult = await query(`
        SELECT COUNT(id) as total_bookings, COALESCE(SUM(NULLIF(total_price, 0)), 0) as total_revenue
        FROM bookings WHERE status = 'confirmed' AND created_at >= date_trunc('month', CURRENT_DATE)
      `);
    } catch (error) {
      logger.error('Error fetching booking stats:', error);
    }

    try {
      lastMonthStatsResult = await query(`
        SELECT COUNT(id) as total_bookings, COALESCE(SUM(NULLIF(total_price, 0)), 0) as total_revenue
        FROM bookings WHERE status = 'confirmed'
        AND created_at >= date_trunc('month', CURRENT_DATE - interval '1' month)
        AND created_at < date_trunc('month', CURRENT_DATE)
      `);
    } catch (error) {
      logger.error('Error fetching last month stats:', error);
    }

    try {
      recentBookingsResult = await query(`
        SELECT b.id, b.total_price as amount, b.status, b.start_date, b.end_date,
               u.name as user_name, u.email as user_email, v.name as vehicle_name
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN vehicles v ON b.vehicle_id = v.id
        WHERE b.status != 'cancelled'
        ORDER BY b.created_at DESC LIMIT 5
      `);
    } catch (error) {
      logger.error('Error fetching recent bookings:', error);
    }

    try {
      // Query to fetch recent activity from various sources
      recentActivityResult = await query(`
        WITH booking_activity AS (
          SELECT 
            'booking' as type,
            CASE 
              WHEN b.status = 'confirmed' THEN 'Booking confirmed'
              WHEN b.status = 'pending' THEN 'New booking created'
              ELSE 'Booking ' || b.status
            END as message,
            b.created_at as activity_time,
            b.id as entity_id
          FROM bookings b
          ORDER BY b.created_at DESC
          LIMIT 3
        ),
        vehicle_activity AS (
          SELECT 
            'vehicle' as type,
            'New vehicle added: ' || v.name as message,
            v.created_at as activity_time,
            v.id as entity_id
          FROM vehicles v
          ORDER BY v.created_at DESC
          LIMIT 2
        ),
        user_activity AS (
          SELECT 
            'user' as type,
            'New user registered: ' || u.name as message,
            u.created_at as activity_time,
            u.id as entity_id
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
    } catch (error) {
      logger.error('Error fetching recent activity:', error);
    }

    // Calculate growth percentages
    const calculateGrowth = (current: number, previous: number): number | null => {
      // Return null if both values are zero (no meaningful growth to show)
      if (current === 0 && previous === 0) return null;
      
      // If previous was zero but current has value, it's new growth (100%)
      if (previous === 0) return current > 0 ? 100 : 0;
      
      // Calculate percentage change
      return Math.round(((current - previous) / previous) * 100);
    };

    const dashboardData = {
      totalUsers: parseInt(userStatsResult.rows[0]?.total || '0'),
      totalRevenue: parseFloat(bookingStatsResult.rows[0]?.total_revenue || '0'),
      totalBookings: parseInt(bookingStatsResult.rows[0]?.total_bookings || '0'),
      totalVehicles: parseInt(vehicleStatsResult.rows[0]?.total || '0'),
      bookingGrowth: calculateGrowth(
        parseInt(bookingStatsResult.rows[0]?.total_bookings || '0'),
        parseInt(lastMonthStatsResult.rows[0]?.total_bookings || '0')
      ),
      revenueGrowth: calculateGrowth(
        parseFloat(bookingStatsResult.rows[0]?.total_revenue || '0'),
        parseFloat(lastMonthStatsResult.rows[0]?.total_revenue || '0')
      ),
      recentBookings: recentBookingsResult.rows.map((booking: BookingRow) => ({
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
      })),
      // Process and format recent activity data
      recentActivity: recentActivityResult.rows.map((activity: ActivityRow) => {
        // Convert ISO timestamp to relative time (e.g., "5 minutes ago")
        const timestamp = new Date(activity.timestamp);
        const now = new Date();
        const diffMs = now.getTime() - timestamp.getTime();
        const diffMins = Math.round(diffMs / 60000);
        const diffHours = Math.round(diffMs / 3600000);
        const diffDays = Math.round(diffMs / 86400000);
        
        let relativeTime;
        if (diffMins < 60) {
          relativeTime = `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
          relativeTime = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else {
          relativeTime = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        }
        
        return {
          type: activity.type,
          message: activity.message,
          timestamp: relativeTime,
          entityId: activity.entity_id
        };
      })
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