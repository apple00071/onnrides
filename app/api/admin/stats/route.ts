import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import logger from '@/lib/logger';

interface Booking {
  id: string;
  user_id: string;
  vehicle_id: string;
  start_date: Date;
  end_date: Date;
  total_price: string;
  status: string;
  created_at: Date;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    let usersCount = 0;
    let vehiclesCount = 0;
    let bookingsCount = 0;
    let recentBookings: Booking[] = [];

    try {
      // Get total users
      const { rows: [userStats] } = await sql`
        SELECT COUNT(*)::int as count FROM users
      `;
      usersCount = userStats?.count || 0;

      // Get total vehicles
      const { rows: [vehicleStats] } = await sql`
        SELECT COUNT(*)::int as count FROM vehicles
      `;
      vehiclesCount = vehicleStats?.count || 0;

      // Get total bookings and recent bookings
      try {
        const { rows: [bookingStats] } = await sql`
          SELECT COUNT(*)::int as count FROM bookings
        `;
        bookingsCount = bookingStats?.count || 0;

        // Get recent bookings
        const { rows } = await sql`
          SELECT 
            id::text,
            user_id::text,
            vehicle_id::text,
            start_date::timestamp,
            end_date::timestamp,
            total_price::text,
            status::text,
            created_at::timestamp
          FROM bookings
          ORDER BY created_at DESC
          LIMIT 5
        `;
        recentBookings = rows.map(row => ({
          id: row.id,
          user_id: row.user_id,
          vehicle_id: row.vehicle_id,
          start_date: new Date(row.start_date),
          end_date: new Date(row.end_date),
          total_price: row.total_price,
          status: row.status,
          created_at: new Date(row.created_at),
        }));
      } catch (error: any) {
        if (error.code === '42P01') { // Table does not exist
          logger.warn('Bookings table does not exist yet');
          bookingsCount = 0;
          recentBookings = [];
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('Database error while fetching stats:', error);
      throw error;
    }

    return NextResponse.json({
      stats: {
        total_users: usersCount,
        total_vehicles: vehiclesCount,
        total_bookings: bookingsCount,
      },
      recent_bookings: recentBookings,
    });
  } catch (error) {
    logger.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
} 