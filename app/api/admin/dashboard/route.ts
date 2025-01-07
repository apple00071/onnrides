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
  let client;
  try {
    // Check if user is authenticated and is an admin
    const user = await getCurrentUser(request.cookies);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    client = await pool.connect();

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
    `);

    // Get pending documents count
    const documentsResult = await client.query(`
      SELECT COUNT(*) as pending_documents
      FROM user_documents
      WHERE status = 'pending'
    `);

    // Get recent bookings
    const bookingsResult = await client.query(`
      SELECT 
        b.id,
        u.name as user_name,
        u.email as user_email,
        v.name as vehicle_name,
        b.total_amount as amount,
        b.status,
        b.created_at,
        b.pickup_datetime as start_date,
        b.dropoff_datetime as end_date,
        b.pickup_location,
        b.drop_location
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN vehicles v ON b.vehicle_id = v.id
      ORDER BY b.created_at DESC
      LIMIT 10
    `);

    const stats: DashboardStats = {
      total_users: parseInt(usersResult.rows[0].total_users),
      total_revenue: parseFloat(revenueResult.rows[0].total_revenue),
      total_vehicles: parseInt(vehiclesResult.rows[0].total_vehicles),
      pending_documents: parseInt(documentsResult.rows[0].pending_documents),
      recent_bookings: bookingsResult.rows
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in admin dashboard:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
} 