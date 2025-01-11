import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { COLLECTIONS, generateId, findMany, set, get } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import type { Booking, Vehicle } from '@/lib/types';

interface CreateBookingBody {
  vehicle_id: string;
  startDate: string;
  endDate: string;
}

// GET /api/bookings - List user's bookings
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's bookings
    const bookings = await findMany<Booking>(COLLECTIONS.BOOKINGS, 'user_id', authResult.id);

    // Get vehicle details for each booking
    const bookingsWithVehicles = await Promise.all(
      bookings.map(async (booking) => {
        const vehicle = await get<Vehicle>(COLLECTIONS.VEHICLES, booking.vehicle_id);
        return {
          ...booking,
          vehicle
        };
      })
    );

    return NextResponse.json({
      success: true,
      bookings: bookingsWithVehicles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
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
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json() as CreateBookingBody;
    const { vehicle_id, startDate, endDate } = body;

    // Validate required fields
    if (!vehicle_id || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get vehicle
    const vehicle = await get<Vehicle>(COLLECTIONS.VEHICLES, vehicle_id);
    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Check if vehicle is available
    if (!vehicle.isAvailable) {
      return NextResponse.json(
        { error: 'Vehicle is not available' },
        { status: 400 }
      );
    }

    // Check if dates are valid
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (start < now) {
      return NextResponse.json(
        { error: 'Start date must be in the future' },
        { status: 400 }
      );
    }

    if (end <= start) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Calculate total price
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = days * vehicle.pricePerDay;

    // Create booking
    const bookingId = generateId('bkg');
    const booking: Booking = {
      id: bookingId,
      user_id: authResult.id,
      vehicle_id,
      startDate: start,
      endDate: end,
      totalPrice,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await set(COLLECTIONS.BOOKINGS, booking);

    logger.debug('Booking created successfully:', { bookingId });

    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      booking: {
        ...booking,
        vehicle
      }
    });

  } catch (error) {
    logger.error('Failed to create booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
} 