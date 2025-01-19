import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import type { Booking, Vehicle } from '@/lib/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { bookings, vehicles } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { calculateBookingPrice } from '@/lib/utils';

interface BookingBody {
  vehicleId: string;
  startDate: string;
  endDate: string;
}

// GET /api/bookings - List user's bookings
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's bookings with vehicle details
    const userBookings = await db
      .select({
        booking: bookings,
        vehicle: vehicles
      })
      .from(bookings)
      .leftJoin(vehicles, eq(bookings.vehicle_id, vehicles.id))
      .where(eq(bookings.user_id, session.user.id));

    // Sort bookings by created_at date
    const sortedBookings = userBookings.sort(
      (a, b) => new Date(b.booking.created_at).getTime() - new Date(a.booking.created_at).getTime()
    );

    return NextResponse.json({
      success: true,
      bookings: sortedBookings
    });

  } catch (error) {
    logger.error('Failed to fetch bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// POST /api/bookings - Create a new booking
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json() as BookingBody;
    const { vehicleId, startDate, endDate } = body;

    if (!vehicleId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get vehicle details
    const vehicleResult = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .limit(1);

    if (!vehicleResult[0]) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    const vehicle = {
      ...vehicleResult[0],
      price_per_day: Number(vehicleResult[0].price_per_day),
      price_12hrs: vehicleResult[0].price_12hrs ? Number(vehicleResult[0].price_12hrs) : 0,
      price_24hrs: vehicleResult[0].price_24hrs ? Number(vehicleResult[0].price_24hrs) : 0,
      price_7days: vehicleResult[0].price_7days ? Number(vehicleResult[0].price_7days) : 0,
      price_15days: vehicleResult[0].price_15days ? Number(vehicleResult[0].price_15days) : 0,
      price_30days: vehicleResult[0].price_30days ? Number(vehicleResult[0].price_30days) : 0,
      min_booking_hours: vehicleResult[0].min_booking_hours || 12,
    };

    // Calculate total price using the new pricing structure
    try {
      const totalPrice = calculateBookingPrice(
        vehicle,
        new Date(startDate),
        new Date(endDate)
      );

      // Create the booking
      const [booking] = await db
        .insert(bookings)
        .values({
          user_id: session.user.id,
          vehicle_id: vehicleId,
          start_date: new Date(startDate),
          end_date: new Date(endDate),
          total_price: totalPrice.toString(),
          status: 'pending',
          payment_status: 'pending',
        })
        .returning();

      return NextResponse.json(booking);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to calculate price' },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
} 