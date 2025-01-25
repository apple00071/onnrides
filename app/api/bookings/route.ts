import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { bookings, type NewBooking } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import logger from '@/lib/logger';
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

interface BookingBody {
  vehicle_id: string;
  pickup_datetime: string;
  dropoff_datetime: string;
  total_hours: number;
  total_price: number;
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
      .where(eq(bookings.user_id, session.user.id));
    
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

    // Create booking
    const newBooking: NewBooking = {
      id: nanoid(),
      user_id: session.user.id,
      vehicle_id: body.vehicle_id,
      start_date: new Date(body.pickup_datetime),
      end_date: new Date(body.dropoff_datetime),
      total_hours: body.total_hours,
      total_price: body.total_price,
      status: 'pending',
      payment_status: 'pending'
    };

    const [booking] = await db.insert(bookings).values(newBooking).returning();
    return NextResponse.json({ booking });
  } catch (error) {
    logger.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
} 