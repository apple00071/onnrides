import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';
// Optionally, you can also add runtime configuration
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all bookings that don't have a return record yet
    const result = await query(`
      SELECT 
        b.id,
        b.booking_id,
        b.start_date,
        b.end_date,
        b.status,
        u.name as user_name,
        u.email as user_email,
        v.name as vehicle_name,
        v.type as vehicle_type
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE NOT EXISTS (
        SELECT 1 FROM vehicle_returns vr WHERE vr.booking_id = b.id
      )
      ORDER BY b.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching eligible bookings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch eligible bookings' },
      { status: 500 }
    );
  }
} 