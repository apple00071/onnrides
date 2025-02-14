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
    logger.info('Starting dashboard data fetch');
    
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

    // Ensure we always return a response with the correct headers
    const createResponse = (data: any, status = 200) => {
      const responseBody = JSON.stringify(data);
      logger.info('Creating response:', { 
        status, 
        bodyLength: responseBody.length,
        isEmptyBody: !responseBody || responseBody.length === 0
      });
      
      return new NextResponse(responseBody, { 
        status,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    };

    const session = await getServerSession(authOptions);
    logger.info('Session check:', { 
      hasSession: !!session, 
      hasUser: !!session?.user,
      userRole: session?.user?.role 
    });
    
    if (!session?.user || session.user.role !== 'admin') {
      logger.warn('Unauthorized access attempt to dashboard:', { user: session?.user });
      return createResponse({ 
        success: false,
        error: 'Unauthorized', 
        details: 'Admin access required',
        data: defaultData
      }, 401);
    }

    logger.info('Fetching dashboard data for user:', { userId: session.user.id });

    try {
      // Wrap all database operations in a single try-catch
      const [rawCounts, userStats, vehicleStats, bookingStats, lastMonthStats, recentBookings] = 
        await Promise.all([
          query(`
            SELECT 
              (SELECT COUNT(*) FROM users WHERE role != 'admin') as user_count,
              (SELECT COUNT(*) FROM vehicles) as vehicle_count,
              (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') as booking_count
          `),
          retryQuery(async () => {
            const result = await query('SELECT COUNT(id) as total FROM users WHERE role != \'admin\'');
            if (!result?.rows?.[0]) throw new Error('Failed to fetch user statistics');
            return { total: Number(result.rows[0]?.total) || 0 };
          }),
          retryQuery(async () => {
            const result = await query('SELECT COUNT(id) as total FROM vehicles');
            if (!result?.rows?.[0]) throw new Error('Failed to fetch vehicle statistics');
            return { total: Number(result.rows[0]?.total) || 0 };
          }),
          retryQuery(async () => {
            const result = await query(`
              SELECT 
                COUNT(id) as total_bookings,
                COALESCE(SUM(total_price), 0) as total_revenue
              FROM bookings
              WHERE status = 'confirmed'
            `);
            if (!result?.rows?.[0]) throw new Error('Failed to fetch booking statistics');
            return {
              total_bookings: Number(result.rows[0]?.total_bookings) || 0,
              total_revenue: Number(result.rows[0]?.total_revenue) || 0
            };
          }),
          retryQuery(async () => {
            const result = await query(`
              SELECT 
                COUNT(id) as total_bookings,
                COALESCE(SUM(total_price), 0) as total_revenue
              FROM bookings 
              WHERE status = 'confirmed'
              AND created_at >= date_trunc('month', current_date - interval '1' month)
              AND created_at < date_trunc('month', current_date)
            `);
            if (!result?.rows?.[0]) throw new Error('Failed to fetch last month statistics');
            return {
              total_bookings: Number(result.rows[0]?.total_bookings) || 0,
              total_revenue: Number(result.rows[0]?.total_revenue) || 0
            };
          }),
          retryQuery(async () => {
            const result = await query(`
              SELECT 
                b.id,
                b.total_price as amount,
                b.status,
                b.start_date,
                b.end_date,
                u.name as user_name,
                u.email as user_email,
                v.name as vehicle_name
              FROM bookings b
              LEFT JOIN users u ON b.user_id = u.id
              LEFT JOIN vehicles v ON b.vehicle_id = v.id
              ORDER BY b.created_at DESC
              LIMIT 5
            `);
            
            return (result?.rows || []).map((booking: any) => ({
              id: booking.id,
              amount: Number(booking.amount) || 0,
              status: booking.status,
              startDate: booking.start_date,
              endDate: booking.end_date,
              user: {
                name: booking.user_name,
                email: booking.user_email
              },
              vehicle: {
                name: booking.vehicle_name
              }
            }));
          })
        ]).catch(error => {
          logger.error('Failed to fetch dashboard data:', error);
          throw error;
        });

      if (!rawCounts?.rows?.[0]) {
        logger.error('No raw counts data returned from database');
        return createResponse({
          success: false,
          error: 'Database error',
          details: 'Failed to fetch basic statistics',
          data: defaultData
        });
      }

      logger.info('Raw database counts:', rawCounts.rows[0]);

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
        success: true,
        data: {
          totalUsers: userStats.total,
          totalRevenue: bookingStats.total_revenue,
          totalBookings: bookingStats.total_bookings,
          totalVehicles: vehicleStats.total,
          bookingGrowth,
          revenueGrowth,
          recentBookings
        }
      };

      logger.info('Final response data:', responseData);
      return createResponse(responseData);

    } catch (dbError) {
      logger.error('Database query error:', {
        error: dbError,
        message: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : undefined
      });
      
      return createResponse({ 
        success: false,
        error: 'Database error',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error',
        data: defaultData
      });
    }
  } catch (error) {
    logger.error('Unhandled error in dashboard route:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return createResponse({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      data: defaultData
    });
  }
} 