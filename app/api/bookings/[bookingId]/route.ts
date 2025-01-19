import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { bookings, vehicles } from '@/lib/schema';
import { verifyAuth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import type { Booking, Vehicle } from '@/lib/types';

interface UpdateBookingBody {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus?: 'pending' | 'paid' | 'refunded';
}

// GET /api/bookings/[bookingId] - Get booking by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth();
    if (!authResult) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get booking
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, params.bookingId))
      .limit(1);

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
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, booking.vehicle_id))
      .limit(1);

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

// PATCH /api/bookings/[bookingId] - Update booking status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth();
    if (!authResult) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get booking
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, params.bookingId))
      .limit(1);

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
    const [updatedBooking] = await db
      .update(bookings)
      .set({
        ...(status && { status }),
        ...(paymentStatus && { payment_status: paymentStatus }),
        updated_at: new Date()
      })
      .where(eq(bookings.id, params.bookingId))
      .returning();

    // If status is cancelled, update vehicle availability
    if (status === 'cancelled') {
      await db
        .update(vehicles)
        .set({ is_available: true })
        .where(eq(vehicles.id, booking.vehicle_id));
    }

    // Get vehicle details
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, booking.vehicle_id))
      .limit(1);

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

// POST /api/bookings/[bookingId]/cancel - Cancel booking
export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth();
    if (!authResult) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get booking
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, params.bookingId))
      .limit(1);

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if user is authorized to cancel this booking
    if (booking.user_id !== authResult.id && authResult.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if booking can be cancelled
    if (booking.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending bookings can be cancelled' },
        { status: 400 }
      );
    }

    // Update booking status to cancelled
    const [updatedBooking] = await db
      .update(bookings)
      .set({
        status: 'cancelled',
        updated_at: new Date()
      })
      .where(eq(bookings.id, params.bookingId))
      .returning();

    // Update vehicle availability
    await db
      .update(vehicles)
      .set({ is_available: true })
      .where(eq(vehicles.id, booking.vehicle_id));

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: updatedBooking
    });

  } catch (error) {
    logger.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
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