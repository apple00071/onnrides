import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await getCurrentUser(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      // Get total bookings and total spent
      const bookingsResult = await client.query(`
        SELECT 
          COUNT(*) as total_bookings,
          COALESCE(SUM(total_amount), 0) as total_spent
        FROM bookings
        WHERE user_id = $1
      `, [user.id]);

      // Get total vehicles (available for booking)
      const vehiclesResult = await client.query(`
        SELECT COUNT(*) as total_vehicles
        FROM vehicles
        WHERE is_available = true
      `);

      // Get pending documents
      const documentsResult = await client.query(`
        SELECT COUNT(*) as pending_documents
        FROM document_submissions
        WHERE user_id = $1 AND status = 'pending'
      `, [user.id]);

      // Get recent bookings
      const recentBookingsResult = await client.query(`
        SELECT 
          b.id,
          b.total_amount,
          b.status,
          b.created_at,
          v.name as vehicle_name
        FROM bookings b
        LEFT JOIN vehicles v ON b.vehicle_id = v.id
        WHERE b.user_id = $1
        ORDER BY b.created_at DESC
        LIMIT 10
      `, [user.id]);

      const stats = {
        total_bookings: parseInt(bookingsResult.rows[0].total_bookings),
        total_spent: parseFloat(bookingsResult.rows[0].total_spent),
        total_vehicles: parseInt(vehiclesResult.rows[0].total_vehicles),
        pending_documents: parseInt(documentsResult.rows[0].pending_documents),
        recent_bookings: recentBookingsResult.rows
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