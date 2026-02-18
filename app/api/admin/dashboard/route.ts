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

    // Get total bookings
    const bookingStatsResult = await query(`
      SELECT COUNT(*) as total
      FROM bookings
    `);

    const totalBookings = parseInt(bookingStatsResult.rows[0].total);

    // Get today's operational metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Active rentals today (bookings that are active and current date falls within their rental period)
    const activeRentalsResult = await query(`
      SELECT COUNT(*) as active_rentals
      FROM bookings
      WHERE status IN ('active', 'initiated')
      AND start_date <= $2
      AND end_date >= $1
    `, [today, tomorrow]);

    const activeRentals = parseInt(activeRentalsResult.rows[0].active_rentals);

    // Today's revenue (sum of all completed payments today)
    // Use TO_CHAR and IST to ensure robust comparison
    const todayRevenueResult = await query(`
          SELECT COALESCE(SUM(amount), 0) as today_revenue
          FROM payments
          WHERE TO_CHAR(created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') = TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')
          AND status IN ('completed', 'refunded')
        `);

    const todayRevenue = parseFloat(todayRevenueResult.rows[0].today_revenue || 0);

    logger.info('Today revenue query result:', {
      todayRevenue,
      rowCount: todayRevenueResult.rows.length,
      rawValue: todayRevenueResult.rows[0]
    });

    // Overdue returns (active bookings where end_date has passed)
    const overdueReturnsResult = await query(`
      SELECT COUNT(*) as overdue_returns
      FROM bookings
      WHERE status IN ('active', 'initiated')
      AND end_date < $1
    `, [today]);

    const overdueReturns = parseInt(overdueReturnsResult.rows[0].overdue_returns);

    // Available vehicles
    const availableVehiclesResult = await query(`
      SELECT COUNT(*) as available_vehicles
      FROM vehicles
      WHERE status = 'active'
      AND is_available = true
    `);

    const availableVehicles = parseInt(availableVehiclesResult.rows[0].available_vehicles);

    // Today's pickups (bookings starting today)
    const todayPickupsResult = await query(`
      SELECT COUNT(*) as today_pickups
      FROM bookings
      WHERE DATE(start_date) = DATE($1)
      AND status IN ('confirmed', 'active', 'initiated')
    `, [today]);

    const todayPickups = parseInt(todayPickupsResult.rows[0].today_pickups);

    // Today's returns (bookings ending today)
    const todayReturnsResult = await query(`
      SELECT COUNT(*) as today_returns
      FROM bookings
      WHERE DATE(end_date) = DATE($1)
      AND status IN ('active', 'initiated')
    `, [today]);

    const todayReturns = parseInt(todayReturnsResult.rows[0].today_returns);

    // Maintenance due (vehicles with upcoming maintenance - placeholder for now)
    const maintenanceDue = 0; // This would need a maintenance tracking system


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
        totalBookings,
        bookingGrowth: null, // Calculate this if needed
        // Operational metrics
        activeRentals,
        todayRevenue,
        overdueReturns,
        availableVehicles,
        todayPickups,
        todayReturns,
        maintenanceDue,
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
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
  });
} 
