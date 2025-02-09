import logger from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Helper function to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to retry failed queries
async function retryQuery<T>(
  queryFn: () => Promise<T>,
  retries = 3,
  backoff = 1000
): Promise<T> {
  try {
    return await queryFn();
  } catch (error) {
    if (retries === 0) throw error;
    
    logger.warn(`Query failed, retrying in ${backoff}ms...`, { error });
    await delay(backoff);
    return retryQuery(queryFn, retries - 1, backoff * 2);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      logger.warn('Unauthorized access attempt to dashboard:', { user: session?.user });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('Fetching dashboard data for user:', { userId: session.user.id });

    try {
      // First, let's get raw counts to verify data exists
      const rawCounts = await query(`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE role != 'admin') as user_count,
          (SELECT COUNT(*) FROM vehicles) as vehicle_count,
          (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') as booking_count
      `);
      
      logger.info('Raw database counts:', rawCounts.rows[0]);

      // Get total users (excluding admins) with a simpler query
      const userStats = await retryQuery(async () => {
        const result = await query('SELECT COUNT(id) as total FROM users WHERE role != \'admin\'');
        logger.info('User query result:', {
          raw: result.rows,
          parsed: result.rows[0]?.total,
          type: typeof result.rows[0]?.total
        });
        return { total: Number(result.rows[0]?.total) || 0 };
      });

      // Get total vehicles with a simpler query
      const vehicleStats = await retryQuery(async () => {
        const result = await query('SELECT COUNT(id) as total FROM vehicles');
        logger.info('Vehicle query result:', {
          raw: result.rows,
          parsed: result.rows[0]?.total,
          type: typeof result.rows[0]?.total
        });
        return { total: Number(result.rows[0]?.total) || 0 };
      });

      // Get total bookings and revenue with a simpler query - only confirmed bookings
      const bookingStats = await retryQuery(async () => {
        const result = await query(`
          SELECT 
            COUNT(id) as total_bookings,
            COALESCE(SUM(total_price), 0) as total_revenue
          FROM bookings
          WHERE status = 'confirmed'
        `);
        logger.info('Booking query result:', {
          raw: result.rows,
          parsed: {
            bookings: result.rows[0]?.total_bookings,
            revenue: result.rows[0]?.total_revenue
          },
          types: {
            bookings: typeof result.rows[0]?.total_bookings,
            revenue: typeof result.rows[0]?.total_revenue
          }
        });
        return {
          total_bookings: Number(result.rows[0]?.total_bookings) || 0,
          total_revenue: Number(result.rows[0]?.total_revenue) || 0
        };
      });

      // Get last month's stats for growth calculation - only confirmed bookings
      const lastMonthStats = await retryQuery(async () => {
        const result = await query(`
          SELECT 
            COUNT(id) as total_bookings,
            COALESCE(SUM(total_price), 0) as total_revenue
          FROM bookings 
          WHERE status = 'confirmed'
          AND created_at >= date_trunc('month', current_date - interval '1' month)
          AND created_at < date_trunc('month', current_date)
        `);
        return {
          total_bookings: Number(result.rows[0]?.total_bookings) || 0,
          total_revenue: Number(result.rows[0]?.total_revenue) || 0
        };
      });

      // Calculate growth percentages
      const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      const bookingGrowth = calculateGrowth(
        bookingStats.total_bookings,
        lastMonthStats.total_bookings
      );

      const revenueGrowth = calculateGrowth(
        bookingStats.total_revenue,
        lastMonthStats.total_revenue
      );

      const responseData = {
        totalUsers: userStats.total,
        totalRevenue: bookingStats.total_revenue,
        totalBookings: bookingStats.total_bookings,
        totalVehicles: vehicleStats.total,
        bookingGrowth,
        revenueGrowth,
        recentBookings: []
      };

      logger.info('Final response data:', responseData);

      const response = NextResponse.json(responseData);
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');

      return response;

    } catch (dbError) {
      logger.error('Database query error:', {
        error: dbError,
        message: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : undefined
      });
      
      if (dbError instanceof Error && dbError.message.includes('EAI_AGAIN')) {
        return NextResponse.json(
          { 
            error: 'Database connection error',
            details: 'Unable to connect to the database. Please try again in a few moments.'
          },
          { status: 503 }
        );
      }
      
      throw dbError;
    }

  } catch (error) {
    logger.error('Dashboard API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 