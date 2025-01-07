import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const user = await getCurrentUser(request.cookies);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      // Get total bookings and revenue
      const bookingsResult = await client.query(`
        SELECT 
          COUNT(*) as total_bookings,
          SUM(total_amount) as total_revenue
        FROM bookings
      `);

      // Get total users
      const usersResult = await client.query(`
        SELECT COUNT(*) as total_users
        FROM users
        WHERE role = 'user'
      `);

      // Get total vehicles
      const vehiclesResult = await client.query(`
        SELECT COUNT(*) as total_vehicles
        FROM vehicles
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
          b.total_amount,
          b.status,
          b.created_at,
          u.email as user_email,
          p.name as user_name,
          v.name as vehicle_name
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN profiles p ON u.id = p.user_id
        LEFT JOIN vehicles v ON b.vehicle_id = v.id
        ORDER BY b.created_at DESC
        LIMIT 10
      `);

      // Get monthly revenue
      const monthlyRevenueResult = await client.query(`
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          SUM(total_amount) as revenue
        FROM bookings
        WHERE status = 'completed'
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
      `);

      // Get vehicle type distribution
      const vehicleTypesResult = await client.query(`
        SELECT 
          type,
          COUNT(*) as count
        FROM vehicles
        GROUP BY type
      `);

      // Compile all reports
      const reports = [
        {
          id: '1',
          type: 'summary',
          data: {
            total_bookings: bookingsResult.rows[0].total_bookings,
            total_revenue: bookingsResult.rows[0].total_revenue,
            total_users: usersResult.rows[0].total_users,
            total_vehicles: vehiclesResult.rows[0].total_vehicles,
            pending_documents: documentsResult.rows[0].pending_documents
          },
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          type: 'recent_bookings',
          data: recentBookingsResult.rows,
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          type: 'monthly_revenue',
          data: monthlyRevenueResult.rows,
          created_at: new Date().toISOString()
        },
        {
          id: '4',
          type: 'vehicle_distribution',
          data: vehicleTypesResult.rows,
          created_at: new Date().toISOString()
        }
      ];

      return NextResponse.json(reports);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error generating reports:', error);
    return NextResponse.json(
      { error: 'Failed to generate reports' },
      { status: 500 }
    );
  }
} 