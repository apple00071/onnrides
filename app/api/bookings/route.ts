import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import type { Booking, Vehicle } from '@/lib/types';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { bookings, vehicles } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { calculateBookingPrice, calculateTotalPrice, calculateDuration } from '@/lib/utils';

interface BookingBody {
  vehicleId: string;
  startDate: string;
  endDate: string;
}

// GET /api/bookings - List user's bookings
export async function GET(request: NextRequest) {
  try {
    const session = await verifyAuth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userBookings = await db
      .select({
        id: bookings.id,
        status: bookings.status,
        start_date: bookings.start_date,
        end_date: bookings.end_date,
        duration: bookings.duration,
        amount: bookings.amount,
        vehicle: {
          id: vehicles.id,
          name: vehicles.name,
          type: vehicles.type,
          location: vehicles.location,
          images: vehicles.images,
          price_per_hour: vehicles.price_per_hour,
        },
      })
      .from(bookings)
      .innerJoin(vehicles, eq(bookings.vehicle_id, vehicles.id))
      .where(eq(bookings.user_id, session.user.id))
      .orderBy(desc(bookings.created_at));

    return NextResponse.json({
      bookings: userBookings.map(booking => ({
        ...booking,
        amount: Number(booking.amount),
        vehicle: {
          ...booking.vehicle,
          location: booking.vehicle.location as unknown as string[],
          images: booking.vehicle.images as unknown as string[],
          price_per_hour: Number(booking.vehicle.price_per_hour),
        },
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/bookings - Create booking
export async function POST(request: NextRequest) {
  try {
    const session = await verifyAuth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { vehicleId, startDate, endDate } = body;

    // Validate required fields
    if (!vehicleId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: vehicleId, startDate, endDate' },
        { status: 400 }
      );
    }

    // Get vehicle details
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId));

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Check if vehicle is available
    if (!vehicle.is_available || vehicle.status !== 'active') {
      return NextResponse.json(
        { error: 'Vehicle is not available for booking' },
        { status: 400 }
      );
    }

    // Calculate booking duration and price
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = calculateDuration(start, end);
    const amount = calculateBookingPrice(start, end, Number(vehicle.price_per_hour));

    // Check if duration meets minimum booking hours
    const minBookingHours = vehicle.min_booking_hours || 1;
    if (duration < minBookingHours) {
      return NextResponse.json(
        { error: `Minimum booking duration is ${minBookingHours} hours` },
        { status: 400 }
      );
    }

    // Create booking
    const [booking] = await db
      .insert(bookings)
      .values({
        user_id: session.user.id,
        vehicle_id: vehicleId,
        start_date: start,
        end_date: end,
        duration: duration,
        amount: String(amount),
        status: 'pending',
      })
      .returning();

    return NextResponse.json({
      message: 'Booking created successfully',
      booking: {
        ...booking,
        amount: Number(booking.amount),
      },
    });
  } catch (error) {
    logger.error('Failed to create booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 