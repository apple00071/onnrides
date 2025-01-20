import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { bookings, vehicles } from '@/lib/schema';
import { verifyAuth } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import type { Booking, Vehicle } from '@/lib/types';

interface UpdateBookingBody {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus?: 'pending' | 'paid' | 'refunded';
}

// GET /api/bookings/[bookingId] - Get booking details
export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await verifyAuth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const [booking] = await db
      .select({
        id: bookings.id,
        status: bookings.status,
        start_date: bookings.start_date,
        end_date: bookings.end_date,
        duration: bookings.duration,
        amount: bookings.amount,
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
      .where(eq(bookings.id, params.bookingId));

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if the booking belongs to the user
    if (session.user.role !== 'admin') {
      const [userBooking] = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.id, params.bookingId),
            eq(bookings.user_id, session.user.id)
          )
        );

      if (!userBooking) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json({
      booking: {
        ...booking,
        amount: Number(booking.amount),
        vehicle: {
          ...booking.vehicle,
          location: booking.vehicle.location as unknown as string[],
          images: booking.vehicle.images as unknown as string[],
          price_per_hour: Number(booking.vehicle.price_per_hour),
        },
      },
    });
  } catch (error) {
    logger.error('Failed to fetch booking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT /api/bookings/[bookingId] - Update booking
export async function PUT(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await verifyAuth();
    if (!session?.user) {
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
    if (booking.user_id !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json() as UpdateBookingBody;
    const { status } = body;

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
      message: 'Booking updated successfully',
      booking: {
        ...updatedBooking,
        vehicle: vehicle ? {
          ...vehicle,
          location: vehicle.location as unknown as string[],
          images: vehicle.images as unknown as string[],
          price_per_hour: Number(vehicle.price_per_hour),
        } : null,
      },
    });

  } catch (error) {
    logger.error('Failed to update booking:', error);
    return NextResponse.json(
      { error: 'Failed to update booking', details: error instanceof Error ? error.message : 'Unknown error' },
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
    const session = await verifyAuth();
    if (!session?.user) {
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
    if (booking.user_id !== session.user.id && session.user.role !== 'admin') {
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
      message: 'Booking cancelled successfully',
      booking: updatedBooking,
    });

  } catch (error) {
    logger.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking', details: error instanceof Error ? error.message : 'Unknown error' },
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