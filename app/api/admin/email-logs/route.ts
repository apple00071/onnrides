import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await query('SELECT COUNT(*) FROM email_logs');
    const totalCount = parseInt(countResult.rows[0].count);

    // Get email logs with pagination
    const result = await query(
      `SELECT el.*, b.vehicle_id, v.name as vehicle_name 
       FROM email_logs el 
       LEFT JOIN bookings b ON el.booking_id = b.id::text 
       LEFT JOIN vehicles v ON b.vehicle_id = v.id 
       ORDER BY el.created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    logger.error('Failed to fetch email logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch email logs' },
      { status: 500 }
    );
  }
} 