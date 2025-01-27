import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function GET() {
  try {
    // Get total users count
    const usersCountResult = await query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE role = 'user'
    `);
    const usersCount = usersCountResult.rows[0].count;

    // Get total revenue
    const revenueResult = await query(`
      SELECT COALESCE(SUM(CAST(total_price AS DECIMAL)), 0) as total
      FROM bookings
      WHERE payment_status = 'paid'
    `);
    const totalRevenue = revenueResult.rows[0].total;

    // Get total bookings count
    const bookingsCountResult = await query(`
      SELECT COUNT(*) as count
      FROM bookings
    `);
    const bookingsCount = bookingsCountResult.rows[0].count;

    // Get total vehicles count
    const vehiclesCountResult = await query(`
      SELECT COUNT(*) as count
      FROM vehicles
    `);
    const vehiclesCount = vehiclesCountResult.rows[0].count;

    return NextResponse.json({
      success: true,
      data: {
        users: usersCount,
        revenue: totalRevenue,
        bookings: bookingsCount,
        vehicles: vehiclesCount
      }
    });
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
} 