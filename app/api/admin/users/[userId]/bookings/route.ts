import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Get user's bookings with vehicle details
    const bookings = await query(
      `SELECT 
        b.id,
        b.start_date,
        b.end_date,
        b.total_hours,
        b.total_price,
        b.status,
        b.payment_status,
        b.created_at,
        v.name as vehicle_name,
        v.type as vehicle_type,
        v.price_per_hour
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.user_id = $1::uuid
      ORDER BY b.created_at DESC`,
      [userId]
    );

    return NextResponse.json(bookings);

  } catch (error) {
    logger.error('Error fetching user bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user bookings' },
      { status: 500 }
    );
  }
} 