import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { bookings, vehicles } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import logger from '@/lib/logger';
import { calculateTotalPrice } from '@/lib/utils';
import crypto from 'crypto';

interface BookingBody {
  vehicleId: string;
  startDate: string;
  endDate: string;
}

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

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalHours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));

    const totalPrice = calculateTotalPrice(
      start,
      end,
      Number(vehicle[0].price_per_hour)
    );

    // Create booking
    const [booking] = await db
      .insert(bookings)
      .values({
        id: crypto.randomUUID(),
        user_id: user.id,
        vehicle_id: vehicleId,
        start_date: start,
        end_date: end,
        total_hours: totalHours,
        total_price: totalPrice,
        status: 'pending',
        payment_status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
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