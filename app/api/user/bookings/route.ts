import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { bookings, vehicles, bookingStatusEnum, paymentStatusEnum } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import logger from '@/lib/logger';
import { calculateTotalPrice } from '@/lib/utils';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userBookings = await db
      .select()
      .from(bookings)
      .innerJoin(vehicles, eq(bookings.vehicle_id, vehicles.id))
      .where(eq(bookings.user_id, user.id))
      .orderBy(desc(bookings.created_at));

    return NextResponse.json(userBookings);
  } catch (error) {
    logger.error('Error fetching user bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

interface BookingBody {
  vehicleId: string;
  startDate: string;
  endDate: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as BookingBody;
    const { vehicleId, startDate, endDate } = body;

    if (!vehicleId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get vehicle details
    const vehicle = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .limit(1);

    if (!vehicle.length) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    const minBookingHours = 12;
    const totalHours = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
        (1000 * 60 * 60)
    );

    if (totalHours < minBookingHours) {
      return NextResponse.json(
        {
          error: `Minimum booking duration is ${minBookingHours} hours`,
        },
        { status: 400 }
      );
    }

    const totalAmount = calculateTotalPrice(totalHours, vehicle[0].price_per_hour);

    // Create booking
    const [booking] = await db
      .insert(bookings)
      .values({
        user_id: user.id,
        vehicle_id: vehicleId,
        start_time: sql`${startDate}::timestamp`,
        end_time: sql`${endDate}::timestamp`,
        total_hours: sql`${totalHours}::numeric`,
        total_amount: sql`${totalAmount}::numeric`,
        status: 'pending',
        payment_status: 'pending',
      })
      .returning();

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
} 