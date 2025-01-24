import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { bookings, vehicles } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import logger from '@/lib/logger';
import { calculateTotalPrice } from '@/lib/utils';
import { randomUUID } from 'crypto';

interface BookingBody {
  vehicleId: string;
  startDate: string;
  endDate: string;
}

interface BookingResponse {
  id: string;
  status: string;
  start_date: Date;
  end_date: Date;
  total_price: number;
  payment_status: string;
  created_at: Date;
  updated_at: Date;
  vehicle: {
    id: string;
    name: string;
    type: string;
    location: string;
    images: string;
    price_per_hour: number;
  };
}

interface FormattedBooking {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  total_price: number;
  payment_status: string;
  created_at: string;
  updated_at: string;
  vehicle: {
    id: string;
    name: string;
    type: string;
    location: string;
    images: string;
    price_per_hour: number;
  };
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
        status: bookings.status,
        start_date: bookings.start_date,
        end_date: bookings.end_date,
        total_price: bookings.total_price,
        payment_status: bookings.payment_status,
        created_at: bookings.created_at,
        updated_at: bookings.updated_at,
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
      .orderBy(desc(bookings.created_at)) as unknown as BookingResponse[];

    // Format the response
    const formattedBookings: FormattedBooking[] = userBookings.map((booking: BookingResponse) => {
      // Safely parse location
      let location = booking.vehicle.location;
      try {
        if (typeof location === 'string') {
          const parsedLocation = JSON.parse(location);
          location = Array.isArray(parsedLocation) ? parsedLocation[0] : location;
        }
      } catch (error) {
        // If parsing fails, keep the original string
        location = location;
      }

      // Safely parse images
      let images = booking.vehicle.images;
      try {
        if (typeof images === 'string') {
          const parsedImages = JSON.parse(images);
          images = Array.isArray(parsedImages) ? parsedImages[0] : images;
        }
      } catch (error) {
        // If parsing fails, keep the original string
        images = images;
      }

      return {
        ...booking,
        start_date: booking.start_date.toISOString(),
        end_date: booking.end_date.toISOString(),
        created_at: booking.created_at.toISOString(),
        updated_at: booking.updated_at.toISOString(),
        total_price: Number(booking.total_price),
        vehicle: {
          ...booking.vehicle,
          location,
          images,
          price_per_hour: Number(booking.vehicle.price_per_hour),
        },
      };
    });

    return NextResponse.json(formattedBookings);
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
        id: randomUUID(),
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
    logger.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
} 