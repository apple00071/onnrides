import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get total users (excluding admins) and monthly growth
    const [userStats] = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 month' THEN 1 END) as this_month,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '2 month' AND created_at < NOW() - INTERVAL '1 month' THEN 1 END) as last_month
      FROM users 
      WHERE role != 'admin'
    `);

    // Get total revenue, bookings and their monthly growth
    const [bookingStats] = await query(`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 month' THEN 1 END) as bookings_this_month,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '2 month' AND created_at < NOW() - INTERVAL '1 month' THEN 1 END) as bookings_last_month,
        COALESCE(SUM(amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '1 month' THEN amount END), 0) as revenue_this_month,
        COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '2 month' AND created_at < NOW() - INTERVAL '1 month' THEN amount END), 0) as revenue_last_month
      FROM bookings
    `);

    // Get total vehicles and monthly growth
    const [vehicleStats] = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 month' THEN 1 END) as this_month,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '2 month' AND created_at < NOW() - INTERVAL '1 month' THEN 1 END) as last_month
      FROM vehicles
    `);

    // Get recent bookings
    const recentBookings = await query(`
      SELECT 
        b.id,
        b.amount,
        b.status,
        b.start_date as "startDate",
        b.end_date as "endDate",
        json_build_object(
          'name', u.name,
          'email', u.email
        ) as user,
        json_build_object(
          'name', v.name
        ) as vehicle
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN vehicles v ON b.vehicle_id = v.id
      ORDER BY b.created_at DESC
      LIMIT 5
    `);

    // Calculate percentage changes
    const userGrowth = userStats.last_month > 0 
      ? Math.round(((userStats.this_month - userStats.last_month) / userStats.last_month) * 100)
      : userStats.this_month > 0 ? 100 : 0;

    const revenueGrowth = bookingStats.revenue_last_month > 0
      ? Math.round(((bookingStats.revenue_this_month - bookingStats.revenue_last_month) / bookingStats.revenue_last_month) * 100)
      : bookingStats.revenue_this_month > 0 ? 100 : 0;

    const bookingGrowth = bookingStats.bookings_last_month > 0
      ? Math.round(((bookingStats.bookings_this_month - bookingStats.bookings_last_month) / bookingStats.bookings_last_month) * 100)
      : bookingStats.bookings_this_month > 0 ? 100 : 0;

    const vehicleGrowth = vehicleStats.last_month > 0
      ? Math.round(((vehicleStats.this_month - vehicleStats.last_month) / vehicleStats.last_month) * 100)
      : vehicleStats.this_month > 0 ? 100 : 0;

    return NextResponse.json({
      totalUsers: userStats.total,
      userGrowth,
      totalRevenue: bookingStats.total_revenue,
      revenueGrowth,
      totalBookings: bookingStats.total_bookings,
      bookingGrowth,
      totalVehicles: vehicleStats.total,
      vehicleGrowth,
      recentBookings
    });

  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 