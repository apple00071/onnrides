import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface DashboardStats {
  total_users: number;
  total_revenue: number;
  total_vehicles: number;
  pending_documents: number;
  recent_bookings: Array<{
    id: string;
    amount: number;
    created_at: string;
    pickup_datetime: string;
    dropoff_datetime: string;
    status: string;
    user: {
      name: string | null;
      email: string;
    };
    vehicle: {
      name: string;
      type: string;
    };
  }>;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get total users
    const [usersResult] = await query(`
      SELECT COUNT(*) as value 
      FROM users
    `);

    // Get total revenue
    const [revenueResult] = await query(`
      SELECT COALESCE(SUM(amount), 0) as value 
      FROM bookings 
      WHERE status = 'completed'
    `);

    // ... existing code ...
  } catch (error) {
    logger.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
} 