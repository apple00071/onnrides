import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { bookings, type NewBooking } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import logger from '@/lib/logger';
import { NextResponse } from 'next/server';

interface BookingBody {
  vehicle_id: string;
  pickup_datetime: string;
  dropoff_datetime: string;
  total_hours: string;
  total_price: string;
}

// GET /api/bookings - List user's bookings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userBookings = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.user_id, session.user.id)));
    
    return NextResponse.json(userBookings);
  } catch (error) {
    logger.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

// POST /api/bookings - Create booking
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as BookingBody;
    logger.info('Received booking request:', body);

    // Validate required fields
    if (!body.vehicle_id || !body.pickup_datetime || !body.dropoff_datetime || !body.total_hours || !body.total_price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create booking with correct column names
    const newBooking: NewBooking = {
      user_id: session.user.id,
      vehicle_id: body.vehicle_id,
      pickup_datetime: new Date(body.pickup_datetime),
      dropoff_datetime: new Date(body.dropoff_datetime),
      total_hours: body.total_hours,
      total_price: body.total_price,
      status: 'pending',
      payment_status: 'pending'
    };

    const [booking] = await db.insert(bookings).values(newBooking).returning();
    return NextResponse.json(booking);
  } catch (error) {
    logger.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
} 