import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

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
      `WITH email_data AS (
        SELECT 
          el.*,
          el.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as ist_created_at
        FROM email_logs el
      )
      SELECT 
        ed.id,
        ed.recipient,
        ed.subject,
        ed.message_content,
        ed.booking_id,
        ed.status,
        ed.error,
        ed.message_id,
        ed.ist_created_at,
        v.name as vehicle_name 
      FROM email_data ed
      LEFT JOIN bookings b ON b.id::text = ed.booking_id
      LEFT JOIN vehicles v ON v.id = b.vehicle_id 
      ORDER BY ed.created_at DESC 
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Format the response data
    const formattedData = result.rows.map(row => ({
      ...row,
      created_at: row.ist_created_at,
      ist_created_at: undefined // Remove the extra field
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
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