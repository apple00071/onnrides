import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get total users
    const { rows: [userStats] } = await query(
      'SELECT COUNT(*) as value FROM users'
    );
    const totalUsers = userStats?.value || 0;

    // Get total vehicles
    const { rows: [vehicleStats] } = await query(
      'SELECT COUNT(*) as value FROM vehicles'
    );
    const totalVehicles = vehicleStats?.value || 0;

    // Get total bookings and revenue
    const { rows: [bookingStats] } = await query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(CAST(total_price AS DECIMAL)), 0) as revenue
      FROM bookings 
      WHERE status = 'completed'
    `);
    
    const totalBookings = bookingStats?.count || 0;
    const totalRevenue = parseFloat(bookingStats?.revenue || '0');

    return NextResponse.json({
      totalUsers,
      totalVehicles,
      totalBookings,
      totalRevenue
    });
  } catch (error) {
    logger.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
} 