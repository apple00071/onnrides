import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

interface DashboardStats {
  total_users: number;
  total_revenue: number;
  total_vehicles: number;
  pending_documents: number;
  recent_bookings: Array<{
    id: string;
    user_name: string;
    user_email: string;
    vehicle_name: string;
    amount: number;
    status: string;
    created_at: string;
    start_date: string;
    end_date: string;
    pickup_location: string;
    drop_location: string;
  }>;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const user = await getCurrentUser(request.cookies);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      // Get total users
      const usersResult = await client.query(`
        SELECT COUNT(*) as total_users
        FROM users
        WHERE role = 'user'
      `);

      // Get total revenue
      const revenueResult = await client.query(`
        SELECT COALESCE(SUM(total_amount), 0) as total_revenue
        FROM bookings
        WHERE status = 'completed'
      `);

      // Get total vehicles
      const vehiclesResult = await client.query(`
        SELECT COUNT(*) as total_vehicles
        FROM vehicles
        WHERE status = 'active'
      `);

      // Get pending documents
      const documentsResult = await client.query(`
        SELECT COUNT(*) as pending_documents
        FROM document_submissions
        WHERE status = 'pending'
      `);

      // Get recent bookings
      const recentBookingsResult = await client.query(`
        SELECT 
          b.id,
          b.status,
          b.pickup_datetime as start_date,
          b.dropoff_datetime as end_date,
          b.created_at,
          b.total_amount as amount,
          b.pickup_location,
          b.drop_location,
          u.email as user_email,
          CONCAT(p.first_name, ' ', COALESCE(p.last_name, '')) as user_name,
          v.name as vehicle_name
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN profiles p ON u.id = p.user_id
        LEFT JOIN vehicles v ON b.vehicle_id = v.id
        ORDER BY b.created_at DESC
        LIMIT 10
      `);

      const stats: DashboardStats = {
        total_users: parseInt(usersResult.rows[0].total_users),
        total_revenue: parseFloat(revenueResult.rows[0].total_revenue) || 0,
        total_vehicles: parseInt(vehiclesResult.rows[0].total_vehicles),
        pending_documents: parseInt(documentsResult.rows[0].pending_documents),
        recent_bookings: recentBookingsResult.rows.map(booking => ({
          id: booking.id.toString(),
          user_name: booking.user_name || 'Unknown',
          user_email: booking.user_email || 'No email',
          vehicle_name: booking.vehicle_name || 'Unknown vehicle',
          amount: parseFloat(booking.amount) || 0,
          status: booking.status,
          created_at: booking.created_at.toISOString(),
          start_date: booking.start_date.toISOString(),
          end_date: booking.end_date.toISOString(),
          pickup_location: booking.pickup_location || '',
          drop_location: booking.drop_location || ''
        }))
      };

      return NextResponse.json(stats);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
} 