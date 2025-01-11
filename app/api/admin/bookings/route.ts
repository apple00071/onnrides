import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import logger from '@/lib/logger';
import { COLLECTIONS, get, findMany, update, findOneBy } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import type { Booking, Vehicle, User } from '@/lib/types';

interface UpdateBookingBody {
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
}

// GET /api/admin/bookings - List all bookings
export async function GET(request: NextRequest) {
  try {
    // Verify authentication and admin role
    const authResult = await verifyAuth(request);
    if (!authResult || authResult.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const vehicleId = searchParams.get('vehicleId');

    // Get all bookings
    const pattern = `${COLLECTIONS.BOOKINGS}:*`;
    const keys = await kv.keys(pattern);
    let bookings: Booking[] = [];

    // Fetch each booking
    for (const key of keys) {
      const data = await kv.get<string>(key);
      if (data) {
        const booking = JSON.parse(data) as Booking;

        // Apply filters
        if (status && booking.status !== status) continue;
        if (userId && booking.userId !== userId) continue;
        if (vehicleId && booking.vehicleId !== vehicleId) continue;

        bookings.push(booking);
      }
    }

    // Sort bookings by creation date
    bookings = bookings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Get vehicle and user details for each booking
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        const [vehicle, user] = await Promise.all([
          findOneBy<Vehicle>(COLLECTIONS.VEHICLES, 'id', booking.vehicleId),
          findOneBy<User>(COLLECTIONS.USERS, 'id', booking.userId)
        ]);

        return {
          ...booking,
          vehicle,
          user: user ? {
            id: user.id,
            email: user.email
          } : null
        };
      })
    );

    return NextResponse.json({
      success: true,
      bookings: bookingsWithDetails
    });

  } catch (error) {
    logger.error('Failed to fetch bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/bookings - Update booking status
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication and admin role
    const authResult = await verifyAuth(request);
    if (!authResult || authResult.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json() as UpdateBookingBody & { id: string };
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Booking ID and status are required' },
        { status: 400 }
      );
    }

    // Get booking
    const booking = await findOneBy<Booking>(COLLECTIONS.BOOKINGS, 'id', id);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Validate status transition
    if (!isValidStatusTransition(booking.status, status)) {
      return NextResponse.json(
        { error: 'Invalid status transition' },
        { status: 400 }
      );
    }

    // Update booking
    await update(COLLECTIONS.BOOKINGS, id, {
      status,
      updatedAt: new Date()
    });

    // Get updated booking with details
    const updatedBooking = await findOneBy<Booking>(COLLECTIONS.BOOKINGS, 'id', id);
    const [vehicle, user] = await Promise.all([
      findOneBy<Vehicle>(COLLECTIONS.VEHICLES, 'id', booking.vehicleId),
      findOneBy<User>(COLLECTIONS.USERS, 'id', booking.userId)
    ]);

    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      booking: {
        ...updatedBooking,
        vehicle,
        user: user ? {
          id: user.id,
          email: user.email
        } : null
      }
    });

  } catch (error) {
    logger.error('Failed to update booking:', error);
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}

// Helper function to validate booking status transitions
function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['completed', 'cancelled'],
    cancelled: [],
    completed: []
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
} 