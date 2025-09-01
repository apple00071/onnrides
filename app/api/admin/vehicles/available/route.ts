import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';

export async function POST(request: Request) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { startDateTime, endDateTime } = body;

    if (!startDateTime || !endDateTime) {
      return new NextResponse('Start and end dates are required', { status: 400 });
    }

    // Query available vehicles that are not booked during the specified time period
    const result = await query(
      `SELECT v.id, v.name, v.type, v.location, v.price_per_hour
       FROM vehicles v
       WHERE v.status = 'active'
       AND v.is_available = true
       AND NOT EXISTS (
         SELECT 1 FROM bookings b
         WHERE b.vehicle_id = v.id
         AND b.status NOT IN ('cancelled', 'completed')
         AND (
           (b.start_date <= $1::timestamp AND b.end_date >= $1::timestamp)
           OR (b.start_date <= $2::timestamp AND b.end_date >= $2::timestamp)
           OR (b.start_date >= $1::timestamp AND b.end_date <= $2::timestamp)
         )
       )
       ORDER BY v.name ASC`,
      [startDateTime, endDateTime]
    );

    return NextResponse.json({ vehicles: result.rows });
  } catch (error) {
    console.error('Error fetching available vehicles:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 