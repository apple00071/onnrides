import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { bookings, vehicles } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import logger from '@/lib/logger';
import { calculateTotalPrice } from '@/lib/utils';
import { createId } from '@paralleldrive/cuid2';

interface BookingBody {
  vehicleId: string;
  startDate: string;
  endDate: string;
}

interface BookingResponse {
  id: string;
  status: string;
  start_time: Date;
  end_time: Date;
  total_amount: number;
  payment_status: string;
  created_at: Date;
  updated_at: Date;
  vehicle: {
    id: string;
    brand: string;
    model: string;
    type: string;
    year: string;
    color: string;
    location: string;
    description: string | null;
    price_per_day: number;
  };
}

interface FormattedBooking {
  id: string;
  status: string;
  start_time: string;
  end_time: string;
  total_amount: number;
  payment_status: string;
  created_at: string;
  updated_at: string;
  vehicle: {
    id: string;
    brand: string;
    model: string;
    type: string;
    year: string;
    color: string;
    location: string;
    description: string | null;
    price_per_day: number;
    display_name: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth();
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userBookings = await db
      .select({
        id: bookings.id,
        status: bookings.status,
        start_time: bookings.start_time,
        end_time: bookings.end_time,
        total_amount: bookings.total_amount,
        payment_status: bookings.payment_status,
        created_at: bookings.created_at,
        updated_at: bookings.updated_at,
        vehicle: {
          id: vehicles.id,
          brand: vehicles.brand,
          model: vehicles.model,
          type: vehicles.type,
          year: vehicles.year,
          color: vehicles.color,
          location: vehicles.location,
          description: vehicles.description,
          price_per_day: vehicles.price_per_day,
        },
      })
      .from(bookings)
      .innerJoin(vehicles, eq(bookings.vehicle_id, vehicles.id) as any)
      .where(eq(bookings.user_id, user.id) as any)
      .orderBy(desc(bookings.created_at) as any) as unknown as BookingResponse[];

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

      return {
        ...booking,
        start_time: booking.start_time.toISOString(),
        end_time: booking.end_time.toISOString(),
        created_at: booking.created_at.toISOString(),
        updated_at: booking.updated_at.toISOString(),
        total_amount: Number(booking.total_amount),
        vehicle: {
          ...booking.vehicle,
          location,
          price_per_day: Number(booking.vehicle.price_per_day),
          display_name: `${booking.vehicle.brand} ${booking.vehicle.model} (${booking.vehicle.year})`
        },
      };
    });

    return new NextResponse(JSON.stringify(formattedBookings), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Error fetching user bookings:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch bookings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth();
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = (await request.json()) as BookingBody;
    const { vehicleId, startDate, endDate } = body;

    if (!vehicleId || !startDate || !endDate) {
      return new NextResponse(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get vehicle details
    const vehicle = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId) as any)
      .limit(1);

    if (!vehicle.length) {
      return new NextResponse(JSON.stringify({ error: 'Vehicle not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalAmount = calculateTotalPrice(
      start,
      end,
      Number(vehicle[0].price_per_day)
    );

    // Create booking
    const [booking] = await db
      .insert(bookings)
      .values({
        user_id: user.id,
        vehicle_id: vehicleId,
        start_time: start,
        end_time: end,
        total_amount: totalAmount,
        status: 'pending',
        payment_status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      } as any)
      .returning();

    return new NextResponse(JSON.stringify(booking), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Error creating booking:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to create booking' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 