import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { COLLECTIONS, get, update } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import type { Booking, Vehicle, User } from '@/lib/types';

interface UpdateBookingBody {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus?: 'pending' | 'paid' | 'refunded';
  notes?: string;
}

// GET /api/admin/bookings/[id] - Get booking details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication and admin role
    const authResult = await verifyAuth(request);
    if (!authResult || authResult.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get booking
    const booking = await get<Booking>(COLLECTIONS.BOOKINGS, 'id', params.id);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Get vehicle and user details
    const [vehicle, user] = await Promise.all([
      get<Vehicle>(COLLECTIONS.VEHICLES, 'id', booking.vehicleId),
      get<User>(COLLECTIONS.USERS, 'id', booking.userId)
    ]);

    return NextResponse.json({
      success: true,
      booking: {
        ...booking,
        vehicle,
        user: user ? {
          id: user.id,
          email: user.email,
          role: user.role
        } : null
      }
    });

  } catch (error) {
    logger.error('Failed to fetch booking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/bookings/[id] - Update booking
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication and admin role
    const authResult = await verifyAuth(request);
    if (!authResult || authResult.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get booking
    const booking = await get<Booking>(COLLECTIONS.BOOKINGS, 'id', params.id);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const body = await request.json() as UpdateBookingBody;
    const { status, paymentStatus, notes } = body;

    // Validate status transition
    if (status && !isValidStatusTransition(booking.status, status)) {
      return NextResponse.json(
        { error: 'Invalid status transition' },
        { status: 400 }
      );
    }

    // Update booking
    await update(COLLECTIONS.BOOKINGS, params.id, {
      ...(status && { status }),
      ...(paymentStatus && { paymentStatus }),
      ...(notes && { notes }),
      updatedAt: new Date()
    });

    // Get updated booking with details
    const updatedBooking = await get<Booking>(COLLECTIONS.BOOKINGS, 'id', params.id);
    const [vehicle, user] = await Promise.all([
      get<Vehicle>(COLLECTIONS.VEHICLES, 'id', booking.vehicleId),
      get<User>(COLLECTIONS.USERS, 'id', booking.userId)
    ]);

    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      booking: {
        ...updatedBooking,
        vehicle,
        user: user ? {
          id: user.id,
          email: user.email,
          role: user.role
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