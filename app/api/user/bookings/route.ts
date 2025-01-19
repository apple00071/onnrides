import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { bookings, vehicles } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import logger from '@/lib/logger';

interface BookingRecord {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  pickup_location: string;
  drop_location: string;
  total_amount: number;
  status: string;
  created_at: string;
  vehicle_name: string;
  brand: string;
  model: string;
  year: number;
  registration_number: string;
  vehicle_type: string;
  fuel_type: string;
  transmission: string;
  seats: number;
  price_per_day: number;
  images: string[];
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
      .select({
        id: bookings.id,
        vehicle_id: bookings.vehicle_id,
        vehicle_name: vehicles.name,
        start_date: bookings.start_date,
        end_date: bookings.end_date,
        total_price: bookings.total_price,
        status: bookings.status,
        payment_status: bookings.payment_status,
        created_at: bookings.created_at
      })
      .from(bookings)
      .innerJoin(vehicles, eq(bookings.vehicle_id, vehicles.id))
      .where(eq(bookings.user_id, user.id))
      .orderBy(bookings.created_at);

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
  pickupLocation: string;
  dropLocation: string;
  totalPrice: number;
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

    const { vehicleId, startDate, endDate, totalPrice } = await request.json() as CreateBookingBody;

    // Validate required fields
    if (!vehicleId || !startDate || !endDate || !totalPrice) {
      return NextResponse.json(
        { error: 'Missing required booking details' },
        { status: 400 }
      );
    }

    // Create booking
    const [booking] = await db
      .insert(bookings)
      .values({
        user_id: user.id,
        vehicle_id: vehicleId,
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        total_price: String(totalPrice),
        status: 'pending',
        payment_status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning();

    return NextResponse.json({
      message: 'Booking created successfully',
      booking: {
        ...booking,
        total_price: Number(booking.total_price)
      }
    });
  } catch (error) {
    logger.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
} 