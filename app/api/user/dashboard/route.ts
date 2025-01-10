import logger from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface DashboardStats {
  total_bookings: number;
  total_spent: number;
  total_vehicles: number;
  pending_documents: number;
  recent_bookings: Array<{
    id: string;
    vehicle_name: string;
    total_amount: number;
    status: string;
    created_at: string;
  }>;
}

export async function GET(request: NextRequest) {
  let client;
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get database connection
    client = await pool.connect();

    try {
      const stats: DashboardStats = {
        total_bookings: 0,
        total_spent: 0,
        total_vehicles: 0,
        pending_documents: 0,
        recent_bookings: []
      };

      // Get total bookings and total spent
      const bookingsResult = await client.query(`
        SELECT COUNT(*) as total_bookings, SUM(total_amount) as total_spent
        FROM bookings
        WHERE user_id = (SELECT id FROM users WHERE email = $1)
      `, [user.email]);
      stats.total_bookings = parseInt(bookingsResult.rows[0].total_bookings);
      stats.total_spent = parseFloat(bookingsResult.rows[0].total_spent) || 0;

      // Get total vehicles (available for booking)
      const vehiclesResult = await client.query(`
        SELECT COUNT(*) as total_vehicles
        FROM vehicles
        WHERE is_available = true
      `);
      stats.total_vehicles = parseInt(vehiclesResult.rows[0].total_vehicles);

      // Get pending documents
      const documentsResult = await client.query(`
        SELECT COUNT(*) as pending_docs
        FROM document_submissions
        WHERE user_id = (SELECT id FROM users WHERE email = $1)
        AND status = 'pending'
      `, [user.email]);
      stats.pending_documents = parseInt(documentsResult.rows[0].pending_docs);

      // Get recent bookings
      const recentBookingsResult = await client.query(`
        SELECT 
          b.id,
          v.name as vehicle_name,
          b.total_amount,
          b.status,
          b.created_at
        FROM bookings b
        JOIN vehicles v ON b.vehicle_id = v.id
        WHERE b.user_id = (SELECT id FROM users WHERE email = $1)
        ORDER BY b.created_at DESC
        LIMIT 5
      `, [user.email]);
      stats.recent_bookings = recentBookingsResult.rows;

      return NextResponse.json(stats);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
} 