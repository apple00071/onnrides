import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

// Mark route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
    return false;
  }
  return true;
}

// GET /api/admin/users/[userId] - Get individual user details
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    const { userId } = params;
    const url = new URL(req.url);
    const include = url.searchParams.get('include')?.split(',') || [];
    const includeBookings = include.includes('bookings');
    const includeTripData = include.includes('tripData');

    // Get user details
    const userResult = await query(`
      SELECT 
        id::text, name, email, phone, 
        created_at as "createdAt", 
        updated_at as "updatedAt",
        COALESCE(is_blocked, FALSE) as is_blocked
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0];

    // Get documents
    const documentsResult = await query(`
      SELECT 
        id::text, type, file_url, status, 
        rejection_reason, created_at, updated_at
      FROM documents
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);
    user.documents = documentsResult.rows;

    // Get bookings if requested
    if (includeBookings) {
      const bookingsResult = await query(`
        SELECT 
          b.id, b.booking_id, b.start_date, b.end_date, 
          b.total_price, b.status, b.payment_status, b.created_at,
          v.name as vehicle_name, v.type as vehicle_type
        FROM bookings b
        LEFT JOIN vehicles v ON b.vehicle_id = v.id
        WHERE b.user_id = $1
        ORDER BY b.created_at DESC
      `, [userId]);
      user.bookings = bookingsResult.rows;
    }

    // Get trip statistics if requested
    if (includeTripData) {
      const tripDataResult = await query(`
        SELECT 
          COUNT(*) as total_trips,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_trips,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_trips,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END), 0) as total_spent
        FROM bookings
        WHERE user_id = $1
      `, [userId]);

      const stats = tripDataResult.rows[0];
      user.trip_data = {
        total_trips: parseInt(stats.total_trips),
        completed_trips: parseInt(stats.completed_trips),
        cancelled_trips: parseInt(stats.cancelled_trips),
        total_spent: parseFloat(stats.total_spent)
      };
    }

    return NextResponse.json(user);
  } catch (error) {
    logger.error('Error fetching user details:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/admin/users/[userId] - Toggle user block status
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    const { userId } = params;

    const result = await query(`
      UPDATE users
      SET is_blocked = NOT COALESCE(is_blocked, FALSE),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id::text, name, email, is_blocked
    `, [userId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    logger.error('Error toggling user block status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/admin/users/[userId] - Update user details
export async function PUT(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    const { userId } = params;
    const { name, phone, role } = await request.json();

    const result = await query(
      `UPDATE users 
       SET name = COALESCE($1, name), 
           phone = COALESCE($2, phone), 
           role = COALESCE($3, role),
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 
       RETURNING *`,
      [name, phone, role, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: result.rows[0] });
  } catch (error) {
    logger.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/admin/users/[userId] - Delete user
export async function DELETE(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    const { userId } = params;

    // S3: Implement User Deletion Guard (Check active bookings)
    const activeBookings = await query(
      `SELECT COUNT(*) FROM bookings 
       WHERE user_id = $1 AND status IN ('pending', 'confirmed', 'initiated')`,
      [userId]
    );

    if (parseInt(activeBookings.rows[0].count) > 0) {
      return NextResponse.json({
        error: 'Cannot delete user with active bookings. Cancel or complete all bookings first.'
      }, { status: 400 });
    }

    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}