import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { User } from '@/lib/types';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface Reports {
  total_bookings: number;
  total_revenue: number;
  total_users: number;
  total_vehicles: number;
  pending_documents: number;
  monthly_revenue: { month: string; revenue: number }[];
  vehicle_distribution: { type: string; count: number }[];
}

interface BookingStats {
  total_bookings: number;
  total_revenue: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

interface VehicleDistribution {
  type: string;
  count: number;
}

export async function GET(request: NextRequest) {
  try {
    // Auth check: admin only
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get URL parameters for pagination (optional but good practice)
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get activity logs
    const result = await query(`
      SELECT 
        id,
        type,
        message,
        metadata,
        created_at
      FROM activity_logs
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    // Map database rows to the format expected by the frontend
    const reports = result.rows.map((row: any) => ({
      id: row.id,
      type: row.type || 'SYSTEM',
      data: {
        message: row.message,
        ...(row.metadata || {})
      },
      created_at: row.created_at
    }));

    return NextResponse.json(reports);
  } catch (error) {
    logger.error('Error generating reports:', error);
    return NextResponse.json(
      { error: 'Failed to generate reports' },
      { status: 500 }
    );
  }
}
