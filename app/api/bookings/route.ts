import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import type { Booking, Vehicle } from '@/lib/types';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { bookings, vehicles } from '@/lib/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { calculateBookingPrice, calculateTotalPrice, calculateDuration } from '@/lib/utils';
import crypto from 'crypto';
import type { Session } from 'next-auth';

interface BookingBody {
  vehicleId: string;
  startDate: string;
  endDate: string;
}

// GET /api/bookings - List user's bookings
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth();
    if (!user) {
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
        total_price: bookings.total_price,
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
      .where(eq(bookings.user_id, user.id))
      .orderBy(desc(bookings.created_at));

    return NextResponse.json({
      bookings: userBookings.map(booking => ({
        ...booking,
        total_price: Number(booking.total_price),
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
    const user = await verifyAuth();
    if (!user) {
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

    // Calculate total price
    const totalPrice = calculateTotalPrice(
      new Date(startDate),
      new Date(endDate),
      Number(vehicle[0].price_per_hour)
    );

    // Create booking
    const [booking] = await db
      .insert(bookings)
      .values({
        id: crypto.randomUUID(),
        user_id: user.id,
        vehicle_id: vehicleId,
        start_date: sql`${startDate}::timestamp`,
        end_date: sql`${endDate}::timestamp`,
        total_price: sql`${totalPrice}::decimal`,
        status: 'pending',
        payment_status: 'pending',
        created_at: sql`CURRENT_TIMESTAMP`,
        updated_at: sql`CURRENT_TIMESTAMP`
      })
      .returning();

    return NextResponse.json(booking);
  } catch (error) {
    logger.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
} 