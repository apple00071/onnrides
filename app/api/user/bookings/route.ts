import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { bookings, vehicles, bookingStatusEnum, paymentStatusEnum } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import logger from '@/lib/logger';

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

interface CreateBookingBody {
  vehicleId: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  totalAmount: number;
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json() as CreateBookingBody;
    const { vehicleId, startDate, endDate, totalHours, totalAmount } = body;

    const [booking] = await db
      .insert(bookings)
      .values({
        user_id: user.id,
        vehicle_id: vehicleId,
        start_time: sql`${startDate}::timestamp`,
        end_time: sql`${endDate}::timestamp`,
        total_hours: sql`${totalHours}::numeric`,
        total_amount: sql`${totalAmount}::numeric`,
        status: bookingStatusEnum.enumValues[0],
        payment_status: paymentStatusEnum.enumValues[0]
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      booking
    });

  } catch (error) {
    console.error('Failed to create booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
} 