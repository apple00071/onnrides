import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { parseISO, format } from 'date-fns';

export async function POST(request: Request) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { startDateTime, endDateTime, location } = body;

    if (!startDateTime || !endDateTime) {
      return new NextResponse('Start and end dates are required', { status: 400 });
    }

    // Format timestamps for PostgreSQL
    const formattedStartDate = format(parseISO(startDateTime), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    const formattedEndDate = format(parseISO(endDateTime), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");

    // Query vehicles based on location quantity or global quantity
    let queryStr = '';
    let queryParams = [formattedStartDate, formattedEndDate];

    if (location) {
      queryStr = `
        SELECT v.id, v.name, v.type, v.location, v.price_per_hour, v.quantity, v.location_quantities
        FROM vehicles v
        WHERE v.status = 'active'
        AND v.is_available = true
        AND (
          SELECT COUNT(*)
          FROM bookings b
          WHERE b.vehicle_id = v.id
          AND b.pickup_location = $3
          AND b.status NOT IN ('cancelled', 'completed')
          AND (
            (b.start_date <= $1::timestamptz AND b.end_date >= $1::timestamptz)
            OR (b.start_date <= $2::timestamptz AND b.end_date >= $2::timestamptz)
            OR (b.start_date >= $1::timestamptz AND b.end_date <= $2::timestamptz)
          )
        ) < COALESCE(CAST(v.location_quantities->>$3 AS INTEGER), 0)
        ORDER BY v.name ASC`;
      queryParams.push(location);
    } else {
      queryStr = `
        SELECT v.id, v.name, v.type, v.location, v.price_per_hour, v.quantity
        FROM vehicles v
        WHERE v.status = 'active'
        AND v.is_available = true
        AND (
          SELECT COUNT(*)
          FROM bookings b
          WHERE b.vehicle_id = v.id
          AND b.status NOT IN ('cancelled', 'completed')
          AND (
            (b.start_date <= $1::timestamptz AND b.end_date >= $1::timestamptz)
            OR (b.start_date <= $2::timestamptz AND b.end_date >= $2::timestamptz)
            OR (b.start_date >= $1::timestamptz AND b.end_date <= $2::timestamptz)
          )
        ) < v.quantity
        ORDER BY v.name ASC`;
    }

    const result = await query(queryStr, queryParams);

    return NextResponse.json({ vehicles: result.rows });
  } catch (error) {
    console.error('Error fetching available vehicles:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 