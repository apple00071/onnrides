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
  const client = await pool.connect();
  
  try {
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

    // Start a transaction
    await client.query('BEGIN');

    // Get total users
    const usersResult = await client.query('SELECT COUNT(*) as total FROM users WHERE role = $1', ['user']);
    
    // Get total revenue
    const revenueResult = await client.query('SELECT COALESCE(SUM(amount), 0) as total FROM bookings WHERE status = $1', ['completed']);
    
    // Get total vehicles
    const vehiclesResult = await client.query('SELECT COUNT(*) as total FROM vehicles');
    
    // Get pending documents
    const documentsResult = await client.query('SELECT COUNT(*) as total FROM documents WHERE status = $1', ['pending']);
    
    // Get recent bookings
    const bookingsResult = await client.query(`
      SELECT 
        b.id,
        u.name as user_name,
        u.email as user_email,
        v.name as vehicle_name,
        b.amount,
        b.status,
        b.created_at,
        b.start_date,
        b.end_date,
        b.pickup_location,
        b.drop_location
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN vehicles v ON b.vehicle_id = v.id
      ORDER BY b.created_at DESC
      LIMIT 5
    `);

    // Commit the transaction
    await client.query('COMMIT');

    const stats: DashboardStats = {
      total_users: parseInt(usersResult.rows[0].total),
      total_revenue: parseFloat(revenueResult.rows[0].total),
      total_vehicles: parseInt(vehiclesResult.rows[0].total),
      pending_documents: parseInt(documentsResult.rows[0].total),
      recent_bookings: bookingsResult.rows
    };

    return NextResponse.json(stats);
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  } finally {
    // Always release the client back to the pool
    client.release();
  }
} 