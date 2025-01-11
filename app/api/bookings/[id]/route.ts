import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { COLLECTIONS, get, update } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import type { Booking, Vehicle } from '@/lib/types';

interface UpdateBookingBody {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus?: 'pending' | 'paid' | 'refunded';
}

// GET /api/bookings/[id] - Get booking by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get booking
    const booking = await get<Booking>(COLLECTIONS.BOOKINGS, params.id);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if user is authorized to view this booking
    if (booking.user_id !== authResult.id && authResult.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get vehicle details
    const vehicle = await get<Vehicle>(COLLECTIONS.VEHICLES, booking.vehicle_id);

    return NextResponse.json({
      success: true,
      booking: {
        ...booking,
        vehicle
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

// PATCH /api/bookings/[id] - Update booking status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get booking
    const booking = await get<Booking>(COLLECTIONS.BOOKINGS, params.id);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if user is authorized to update this booking
    if (booking.user_id !== authResult.id && authResult.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json() as UpdateBookingBody;
    const { status, paymentStatus } = body;

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
      updatedAt: new Date()
    });

    // Get updated booking
    const updatedBooking = await get<Booking>(COLLECTIONS.BOOKINGS, params.id);
    const vehicle = await get<Vehicle>(COLLECTIONS.VEHICLES, booking.vehicle_id);

    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      booking: {
        ...updatedBooking,
        vehicle
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